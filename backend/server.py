from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, WebSocket, WebSocketDisconnect, Query, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import uuid
import bcrypt
import jwt
import json
import requests
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

# Storage config
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "studentmarket"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path, data, content_type):
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Password hashing
def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT tokens
def create_access_token(user_id, email, role):
    payload = {"sub": user_id, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id):
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Auth helper
async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(user):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

# Pydantic models
class RegisterInput(BaseModel):
    name: str
    email: str
    password: str
    college: Optional[str] = ""
    area: Optional[str] = ""

class LoginInput(BaseModel):
    email: str
    password: str

class ProductInput(BaseModel):
    name: str
    description: str
    price: float
    category: str
    condition: str = "used"
    college: Optional[str] = ""
    area: Optional[str] = ""

class OrderInput(BaseModel):
    product_id: str
    delivery_method: str  # "local" or "delivery"
    delivery_address: Optional[str] = ""
    phone: str
    notes: Optional[str] = ""

class MessageInput(BaseModel):
    content: str

# App setup
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(input_data: RegisterInput, response: Response):
    email = input_data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "name": input_data.name,
        "email": email,
        "password_hash": hash_password(input_data.password),
        "role": "user",
        "college": input_data.college or "",
        "area": input_data.area or "",
        "mode": "buy",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email, "user")
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "name": input_data.name, "email": email, "role": "user", "college": input_data.college or "", "area": input_data.area or "", "mode": "buy", "token": access_token}

@api_router.post("/auth/login")
async def login(input_data: LoginInput, response: Response, request: Request):
    email = input_data.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = attempt.get("locked_until")
        if lockout_until and datetime.fromisoformat(lockout_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input_data.password, user["password_hash"]):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email, user.get("role", "user"))
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id, "name": user["name"], "email": user["email"],
        "role": user.get("role", "user"), "college": user.get("college", ""),
        "area": user.get("area", ""), "mode": user.get("mode", "buy"), "token": access_token
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        new_access = create_access_token(user_id, user["email"], user.get("role", "user"))
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ==================== USER ROUTES ====================

@api_router.get("/users/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    return user

@api_router.put("/users/profile")
async def update_profile(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    allowed = ["name", "college", "area", "phone", "mode"]
    update_data = {k: v for k, v in body.items() if k in allowed}
    if update_data:
        await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update_data})
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])}, {"_id": 0, "password_hash": 0})
    updated["id"] = user["_id"]
    return updated

@api_router.put("/users/mode")
async def toggle_mode(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    new_mode = body.get("mode", "buy")
    if new_mode not in ["buy", "sell"]:
        raise HTTPException(status_code=400, detail="Mode must be 'buy' or 'sell'")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"mode": new_mode}})
    return {"mode": new_mode}

# ==================== UPLOAD ROUTES ====================

@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['_id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    return {"path": result["path"], "size": result.get("size", 0)}

@api_router.get("/files/{path:path}")
async def download_file(path: str, auth: str = Query(None)):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found")

# ==================== PRODUCT ROUTES ====================

CATEGORIES = ["Books", "Electronics", "Furniture", "Clothing", "Stationery", "Sports", "Musical Instruments", "Lab Equipment", "Art Supplies", "Other"]

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

@api_router.post("/products")
async def create_product(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    
    product = {
        "id": str(uuid.uuid4()),
        "name": body["name"],
        "description": body.get("description", ""),
        "price": float(body["price"]),
        "category": body.get("category", "Other"),
        "condition": body.get("condition", "used"),
        "images": body.get("images", []),
        "seller_id": user["_id"],
        "seller_name": user["name"],
        "seller_college": user.get("college", ""),
        "seller_area": user.get("area", ""),
        "status": "pending",
        "rating": 0,
        "reviews_count": 0,
        "views": 0,
        "orders_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product)
    return {k: v for k, v in product.items() if k != "_id"}

@api_router.get("/products")
async def list_products(
    search: str = "",
    category: str = "",
    status: str = "approved",
    sort: str = "newest",
    page: int = 1,
    limit: int = 20,
    seller_id: str = ""
):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if seller_id:
        query["seller_id"] = seller_id
    if search:
        keywords = search.strip().split()
        or_conditions = []
        for kw in keywords:
            regex = {"$regex": kw, "$options": "i"}
            or_conditions.extend([
                {"name": regex},
                {"description": regex},
                {"category": regex},
                {"seller_college": regex},
                {"seller_area": regex}
            ])
        query["$or"] = or_conditions
    
    sort_field = {"newest": ("created_at", -1), "oldest": ("created_at", 1), "price_low": ("price", 1), "price_high": ("price", -1), "popular": ("orders_count", -1)}
    sf = sort_field.get(sort, ("created_at", -1))
    
    skip = (page - 1) * limit
    products = await db.products.find(query, {"_id": 0}).sort(sf[0], sf[1]).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    return {"products": products, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Increment views
    await db.products.update_one({"id": product_id}, {"$inc": {"views": 1}})
    return product

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, request: Request):
    user = await get_current_user(request)
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["seller_id"] != user["_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    body = await request.json()
    allowed = ["name", "description", "price", "category", "condition", "images"]
    update_data = {k: v for k, v in body.items() if k in allowed}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if user.get("role") != "admin":
        update_data["status"] = "pending"
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    user = await get_current_user(request)
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["seller_id"] != user["_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted"}

@api_router.post("/products/{product_id}/approve")
async def approve_product(product_id: str, request: Request):
    user = await get_current_user(request)
    require_admin(user)
    result = await db.products.update_one({"id": product_id}, {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product approved"}

@api_router.post("/products/{product_id}/reject")
async def reject_product(product_id: str, request: Request):
    user = await get_current_user(request)
    require_admin(user)
    result = await db.products.update_one({"id": product_id}, {"$set": {"status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product rejected"}

# ==================== ORDER ROUTES ====================

@api_router.post("/orders")
async def create_order(input_data: OrderInput, request: Request):
    user = await get_current_user(request)
    product = await db.products.find_one({"id": input_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["status"] != "approved":
        raise HTTPException(status_code=400, detail="Product not available")
    
    order = {
        "id": str(uuid.uuid4()),
        "product_id": input_data.product_id,
        "product_name": product["name"],
        "product_price": product["price"],
        "product_image": product["images"][0] if product.get("images") else "",
        "buyer_id": user["_id"],
        "buyer_name": user["name"],
        "buyer_email": user["email"],
        "seller_id": product["seller_id"],
        "seller_name": product["seller_name"],
        "delivery_method": input_data.delivery_method,
        "delivery_address": input_data.delivery_address or "",
        "phone": input_data.phone,
        "notes": input_data.notes or "",
        "status": "placed",
        "payment_method": "cod",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order)
    await db.products.update_one({"id": input_data.product_id}, {"$inc": {"orders_count": 1}})
    return {k: v for k, v in order.items() if k != "_id"}

@api_router.get("/orders")
async def list_orders(request: Request, role: str = "buyer"):
    user = await get_current_user(request)
    if role == "seller":
        query = {"seller_id": user["_id"]}
    else:
        query = {"buyer_id": user["_id"]}
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["buyer_id"] != user["_id"] and order["seller_id"] != user["_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    new_status = body.get("status")
    valid_statuses = ["placed", "confirmed", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["seller_id"] != user["_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": new_status}})
    return {"message": f"Order status updated to {new_status}"}

# ==================== CHAT/CONVERSATION ROUTES ====================

@api_router.post("/conversations")
async def create_or_get_conversation(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    other_user_id = body.get("other_user_id")
    product_id = body.get("product_id", "")
    
    if not other_user_id:
        raise HTTPException(status_code=400, detail="other_user_id required")
    
    # Check if conversation exists
    existing = await db.conversations.find_one({
        "$or": [
            {"user1_id": user["_id"], "user2_id": other_user_id, "product_id": product_id},
            {"user1_id": other_user_id, "user2_id": user["_id"], "product_id": product_id}
        ]
    }, {"_id": 0})
    
    if existing:
        return existing
    
    other_user = await db.users.find_one({"_id": ObjectId(other_user_id)})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    conv = {
        "id": str(uuid.uuid4()),
        "user1_id": user["_id"],
        "user1_name": user["name"],
        "user2_id": other_user_id,
        "user2_name": other_user["name"],
        "product_id": product_id,
        "last_message": "",
        "last_message_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.conversations.insert_one(conv)
    return {k: v for k, v in conv.items() if k != "_id"}

@api_router.get("/conversations")
async def list_conversations(request: Request):
    user = await get_current_user(request)
    convs = await db.conversations.find(
        {"$or": [{"user1_id": user["_id"]}, {"user2_id": user["_id"]}]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(50)
    return convs

@api_router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str, request: Request):
    user = await get_current_user(request)
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user["_id"] not in [conv["user1_id"], conv["user2_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    messages = await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return messages

@api_router.post("/conversations/{conv_id}/messages")
async def send_message(conv_id: str, input_data: MessageInput, request: Request):
    user = await get_current_user(request)
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user["_id"] not in [conv["user1_id"], conv["user2_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conv_id,
        "sender_id": user["_id"],
        "sender_name": user["name"],
        "content": input_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one({"id": conv_id}, {"$set": {"last_message": input_data.content, "last_message_at": msg["created_at"]}})
    
    # Notify via websocket
    if conv_id in active_connections:
        for ws_user_id, ws in active_connections[conv_id].items():
            if ws_user_id != user["_id"]:
                try:
                    await ws.send_json({k: v for k, v in msg.items() if k != "_id"})
                except Exception:
                    pass
    
    return {k: v for k, v in msg.items() if k != "_id"}

# ==================== WEBSOCKET CHAT ====================

active_connections = {}

@app.websocket("/api/ws/chat/{conv_id}")
async def websocket_chat(websocket: WebSocket, conv_id: str, token: str = Query(None)):
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4001)
        return
    
    await websocket.accept()
    if conv_id not in active_connections:
        active_connections[conv_id] = {}
    active_connections[conv_id][user_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            msg = {
                "id": str(uuid.uuid4()),
                "conversation_id": conv_id,
                "sender_id": user_id,
                "sender_name": user["name"] if user else "Unknown",
                "content": msg_data.get("content", ""),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.messages.insert_one(msg)
            await db.conversations.update_one({"id": conv_id}, {"$set": {"last_message": msg["content"], "last_message_at": msg["created_at"]}})
            
            for ws_user_id, ws in active_connections.get(conv_id, {}).items():
                try:
                    await ws.send_json({k: v for k, v in msg.items() if k != "_id"})
                except Exception:
                    pass
    except WebSocketDisconnect:
        if conv_id in active_connections and user_id in active_connections[conv_id]:
            del active_connections[conv_id][user_id]

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    user = await get_current_user(request)
    require_admin(user)
    
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    pending_products = await db.products.count_documents({"status": "pending"})
    approved_products = await db.products.count_documents({"status": "approved"})
    total_orders = await db.orders.count_documents({})
    
    # Revenue calculation
    orders = await db.orders.find({"status": {"$in": ["placed", "confirmed", "shipped", "delivered"]}}, {"_id": 0, "product_price": 1, "created_at": 1}).to_list(1000)
    total_revenue = sum(o.get("product_price", 0) for o in orders)
    
    # Monthly revenue for chart
    monthly = {}
    for o in orders:
        date_str = o.get("created_at", "")
        if date_str:
            month = date_str[:7]
            monthly[month] = monthly.get(month, 0) + o.get("product_price", 0)
    
    revenue_chart = [{"month": k, "revenue": v} for k, v in sorted(monthly.items())]
    
    return {
        "total_users": total_users,
        "total_products": total_products,
        "pending_products": pending_products,
        "approved_products": approved_products,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "revenue_chart": revenue_chart
    }

@api_router.get("/admin/users")
async def admin_list_users(request: Request):
    user = await get_current_user(request)
    require_admin(user)
    users = await db.users.find({}, {"password_hash": 0}).to_list(500)
    for u in users:
        u["id"] = str(u["_id"])
        del u["_id"]
    return users

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request):
    user = await get_current_user(request)
    require_admin(user)
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

@api_router.get("/admin/products")
async def admin_list_products(request: Request, status: str = ""):
    user = await get_current_user(request)
    require_admin(user)
    query = {}
    if status:
        query["status"] = status
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return products

@api_router.get("/admin/orders")
async def admin_list_orders(request: Request):
    user = await get_current_user(request)
    require_admin(user)
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

# ==================== STARTUP ====================

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@studentmarket.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "college": "",
            "area": "",
            "mode": "buy",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.products.create_index([("name", 1)])
    await db.products.create_index([("category", 1)])
    await db.products.create_index([("status", 1)])
    await db.orders.create_index([("buyer_id", 1)])
    await db.orders.create_index([("seller_id", 1)])
    await db.conversations.create_index([("user1_id", 1), ("user2_id", 1)])
    await db.messages.create_index([("conversation_id", 1)])
    
    await seed_admin()
    
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {os.environ.get('ADMIN_EMAIL', 'admin@studentmarket.com')}\n- Password: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n- Role: admin\n\n## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
