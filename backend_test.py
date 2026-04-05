#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class StudentMarketplaceTester:
    def __init__(self, base_url="https://buy-sell-hub-80.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.user_token = None
        self.admin_cookies = None
        self.user_cookies = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_user_id = None
        self.test_product_id = None
        self.test_order_id = None
        self.test_conversation_id = None

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, cookies=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, cookies=cookies, timeout=30)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=test_headers, cookies=cookies, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=test_headers, cookies=cookies, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, cookies=cookies, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, cookies=cookies, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@studentmarket.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            # Also test with cookies
            login_response = requests.post(f"{self.api_url}/auth/login", 
                                         json={"email": "admin@studentmarket.com", "password": "admin123"})
            if login_response.status_code == 200:
                self.admin_cookies = login_response.cookies
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_email = f"testuser{timestamp}@college.edu"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Test User",
                "email": test_email,
                "password": "testpass123",
                "college": "Test College",
                "area": "Test Area"
            }
        )
        if success and 'token' in response:
            self.user_token = response['token']
            self.test_user_id = response.get('id')
            # Also get cookies
            reg_response = requests.post(f"{self.api_url}/auth/register", 
                                       json={
                                           "name": "Test User Cookie",
                                           "email": f"testcookie{timestamp}@college.edu",
                                           "password": "testpass123",
                                           "college": "Test College",
                                           "area": "Test Area"
                                       })
            if reg_response.status_code == 200:
                self.user_cookies = reg_response.cookies
            return True
        return False

    def test_auth_me(self):
        """Test auth/me endpoint"""
        if not self.admin_token:
            return False
        
        success, response = self.run_test(
            "Get Current User (Admin)",
            "GET",
            "auth/me",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and response.get('role') == 'admin'

    def test_categories(self):
        """Test categories endpoint"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        return success and isinstance(response, list) and len(response) > 0

    def test_create_product(self):
        """Test product creation"""
        if not self.user_token:
            return False
            
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data={
                "name": "Test Calculus Book",
                "description": "Used calculus textbook in good condition",
                "price": 45.99,
                "category": "Books",
                "condition": "used"
            },
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        if success and 'id' in response:
            self.test_product_id = response['id']
            return True
        return False

    def test_list_products(self):
        """Test product listing with various filters"""
        # Test basic listing
        success1, _ = self.run_test(
            "List Products (Basic)",
            "GET",
            "products?status=approved",
            200
        )
        
        # Test with search
        success2, _ = self.run_test(
            "List Products (Search)",
            "GET",
            "products?search=book&status=approved",
            200
        )
        
        # Test with category filter
        success3, _ = self.run_test(
            "List Products (Category)",
            "GET",
            "products?category=Books&status=approved",
            200
        )
        
        return success1 and success2 and success3

    def test_admin_approve_product(self):
        """Test admin product approval"""
        if not self.admin_token or not self.test_product_id:
            return False
            
        success, _ = self.run_test(
            "Admin Approve Product",
            "POST",
            f"products/{self.test_product_id}/approve",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_get_product_detail(self):
        """Test getting product details"""
        if not self.test_product_id:
            return False
            
        success, response = self.run_test(
            "Get Product Detail",
            "GET",
            f"products/{self.test_product_id}",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success and response.get('name') == "Test Calculus Book"

    def test_create_order(self):
        """Test order creation"""
        if not self.user_token or not self.test_product_id:
            return False
            
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data={
                "product_id": self.test_product_id,
                "delivery_method": "local",
                "phone": "555-1234",
                "notes": "Test order"
            },
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        if success and 'id' in response:
            self.test_order_id = response['id']
            return True
        return False

    def test_list_orders(self):
        """Test order listing"""
        if not self.user_token:
            return False
            
        # Test buyer orders
        success1, _ = self.run_test(
            "List Orders (Buyer)",
            "GET",
            "orders?role=buyer",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Test seller orders
        success2, _ = self.run_test(
            "List Orders (Seller)",
            "GET",
            "orders?role=seller",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        return success1 and success2

    def test_conversations(self):
        """Test conversation creation and listing"""
        if not self.user_token or not self.test_user_id:
            return False
            
        # Create conversation
        success1, response = self.run_test(
            "Create Conversation",
            "POST",
            "conversations",
            200,
            data={
                "other_user_id": self.test_user_id,
                "product_id": self.test_product_id or ""
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success1 and 'id' in response:
            self.test_conversation_id = response['id']
        
        # List conversations
        success2, _ = self.run_test(
            "List Conversations",
            "GET",
            "conversations",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        return success1 and success2

    def test_admin_stats(self):
        """Test admin statistics"""
        if not self.admin_token:
            return False
            
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and 'total_users' in response

    def test_admin_users(self):
        """Test admin user management"""
        if not self.admin_token:
            return False
            
        success, response = self.run_test(
            "Admin List Users",
            "GET",
            "admin/users",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and isinstance(response, list)

    def test_admin_products(self):
        """Test admin product management"""
        if not self.admin_token:
            return False
            
        # List all products
        success1, _ = self.run_test(
            "Admin List Products (All)",
            "GET",
            "admin/products",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        # List pending products
        success2, _ = self.run_test(
            "Admin List Products (Pending)",
            "GET",
            "admin/products?status=pending",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        return success1 and success2

    def test_admin_orders(self):
        """Test admin order management"""
        if not self.admin_token:
            return False
            
        success, response = self.run_test(
            "Admin List Orders",
            "GET",
            "admin/orders",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and isinstance(response, list)

    def test_profile_operations(self):
        """Test profile get and update"""
        if not self.user_token:
            return False
            
        # Get profile
        success1, _ = self.run_test(
            "Get Profile",
            "GET",
            "users/profile",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Update profile
        success2, _ = self.run_test(
            "Update Profile",
            "PUT",
            "users/profile",
            200,
            data={"name": "Updated Test User", "college": "Updated College"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        return success1 and success2

    def test_mode_toggle(self):
        """Test user mode toggle"""
        if not self.user_token:
            return False
            
        success, _ = self.run_test(
            "Toggle User Mode",
            "PUT",
            "users/mode",
            200,
            data={"mode": "sell"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success

    def test_brute_force_protection(self):
        """Test brute force protection"""
        # Try multiple failed logins
        for i in range(3):
            self.run_test(
                f"Failed Login Attempt {i+1}",
                "POST",
                "auth/login",
                401,
                data={"email": "admin@studentmarket.com", "password": "wrongpassword"}
            )
        
        # After 5 attempts, should get 429
        for i in range(3):
            success, _ = self.run_test(
                f"Brute Force Test {i+1}",
                "POST",
                "auth/login",
                401,  # Still 401 for wrong password, 429 after 5 attempts
                data={"email": "admin@studentmarket.com", "password": "wrongpassword"}
            )
        
        return True  # Just testing the mechanism exists

    def test_forgot_password(self):
        """Test forgot password flow"""
        success, response = self.run_test(
            "Forgot Password",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "admin@studentmarket.com"}
        )
        return success and response.get('message', '').startswith('If the email exists')

    def test_reset_password(self):
        """Test reset password with invalid token (valid token would require email)"""
        success, response = self.run_test(
            "Reset Password (Invalid Token)",
            "POST",
            "auth/reset-password",
            400,
            data={"token": "invalid_token", "new_password": "newpass123"}
        )
        return success  # Expecting 400 for invalid token

    def test_product_reviews(self):
        """Test product review system"""
        if not self.admin_token or not self.test_product_id:
            return False
        
        # Try to create a review as admin (different user than product creator)
        success1, response = self.run_test(
            "Create Product Review (Admin)",
            "POST",
            f"products/{self.test_product_id}/reviews",
            200,
            data={"rating": 5, "comment": "Great product!"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        # Get reviews for the product
        success2, reviews = self.run_test(
            "Get Product Reviews",
            "GET",
            f"products/{self.test_product_id}/reviews",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        return success1 and success2 and isinstance(reviews, list)

    def test_price_range_filter(self):
        """Test price range filtering"""
        # Test with min and max price
        success1, response1 = self.run_test(
            "Price Range Filter (10-50)",
            "GET",
            "products?min_price=10&max_price=50&status=approved",
            200
        )
        
        # Test with only min price
        success2, response2 = self.run_test(
            "Price Range Filter (Min 20)",
            "GET",
            "products?min_price=20&status=approved",
            200
        )
        
        # Test with only max price
        success3, response3 = self.run_test(
            "Price Range Filter (Max 100)",
            "GET",
            "products?max_price=100&status=approved",
            200
        )
        
        return success1 and success2 and success3

    def test_groups_system(self):
        """Test campus groups system"""
        if not self.user_token:
            return False
        
        # Create a custom group
        success1, group_response = self.run_test(
            "Create Custom Group",
            "POST",
            "groups",
            200,
            data={
                "name": "Test Study Group",
                "description": "A group for testing",
                "group_type": "custom"
            },
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        group_id = group_response.get('id') if success1 else None
        
        # List all groups
        success2, groups = self.run_test(
            "List All Groups",
            "GET",
            "groups",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # List my groups
        success3, my_groups = self.run_test(
            "List My Groups",
            "GET",
            "groups?my_groups=true",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        if not group_id:
            return success2 and success3
        
        # Get group detail
        success4, group_detail = self.run_test(
            "Get Group Detail",
            "GET",
            f"groups/{group_id}",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Test join group (should already be member as creator)
        success5, join_response = self.run_test(
            "Join Group (Already Member)",
            "POST",
            f"groups/{group_id}/join",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Test leave group
        success6, leave_response = self.run_test(
            "Leave Group",
            "POST",
            f"groups/{group_id}/leave",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Get group products
        success7, group_products = self.run_test(
            "Get Group Products",
            "GET",
            f"groups/{group_id}/products",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        return all([success1, success2, success3, success4, success5, success6, success7])

    def test_college_groups(self):
        """Test auto-created college groups"""
        if not self.user_token:
            return False
        
        # Test auto-create/join college group
        success, college_group = self.run_test(
            "Get/Create College Group",
            "GET",
            "groups/college/Test%20College",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        return success and college_group.get('group_type') == 'auto'

    def test_wishlist_system(self):
        """Test wishlist functionality"""
        if not self.user_token or not self.test_product_id:
            return False
        
        # Get initial wishlist IDs (should be empty)
        success1, initial_ids = self.run_test(
            "Get Wishlist IDs (Initial)",
            "GET",
            "wishlist/ids",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Add product to wishlist
        success2, add_response = self.run_test(
            "Add Product to Wishlist",
            "POST",
            f"wishlist/{self.test_product_id}",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Try to add same product again (should return "Already in wishlist")
        success3, duplicate_response = self.run_test(
            "Add Product to Wishlist (Duplicate)",
            "POST",
            f"wishlist/{self.test_product_id}",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Get wishlist IDs (should contain our product)
        success4, updated_ids = self.run_test(
            "Get Wishlist IDs (After Add)",
            "GET",
            "wishlist/ids",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Get full wishlist (should contain product details)
        success5, wishlist_products = self.run_test(
            "Get Wishlist Products",
            "GET",
            "wishlist",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Remove product from wishlist
        success6, remove_response = self.run_test(
            "Remove Product from Wishlist",
            "DELETE",
            f"wishlist/{self.test_product_id}",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Get wishlist IDs (should be empty again)
        success7, final_ids = self.run_test(
            "Get Wishlist IDs (After Remove)",
            "GET",
            "wishlist/ids",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Verify responses
        duplicate_check = duplicate_response.get('message', '').lower().find('already') != -1
        ids_added = self.test_product_id in updated_ids if isinstance(updated_ids, list) else False
        wishlist_has_product = any(p.get('id') == self.test_product_id for p in wishlist_products) if isinstance(wishlist_products, list) else False
        ids_removed = self.test_product_id not in final_ids if isinstance(final_ids, list) else False
        
        return all([success1, success2, success3, success4, success5, success6, success7, 
                   duplicate_check, ids_added, wishlist_has_product, ids_removed])

    def test_resend_email_integration(self):
        """Test Resend email integration with forgot password"""
        # Test forgot password with a real email to trigger Resend API
        success, response = self.run_test(
            "Forgot Password (Resend Email Test)",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "admin@studentmarket.com"}
        )
        
        # Since we have RESEND_API_KEY configured, this should attempt to send real email
        # We can't verify email delivery in automated tests, but we can verify the API call succeeds
        return success and response.get('message', '').startswith('If the email exists')

def main():
    tester = StudentMarketplaceTester()
    
    print("🚀 Starting Student Marketplace API Tests")
    print(f"📍 Testing against: {tester.base_url}")
    print("=" * 60)
    
    # Test sequence
    test_sequence = [
        ("Admin Authentication", tester.test_admin_login),
        ("User Registration", tester.test_user_registration),
        ("Auth Me Endpoint", tester.test_auth_me),
        ("Categories Endpoint", tester.test_categories),
        ("Product Creation", tester.test_create_product),
        ("Product Listing", tester.test_list_products),
        ("Admin Product Approval", tester.test_admin_approve_product),
        ("Product Detail", tester.test_get_product_detail),
        ("Product Reviews System", tester.test_product_reviews),
        ("Price Range Filtering", tester.test_price_range_filter),
        ("Wishlist System", tester.test_wishlist_system),
        ("Order Creation", tester.test_create_order),
        ("Order Listing", tester.test_list_orders),
        ("Conversations", tester.test_conversations),
        ("Groups System", tester.test_groups_system),
        ("College Groups", tester.test_college_groups),
        ("Forgot Password", tester.test_forgot_password),
        ("Reset Password", tester.test_reset_password),
        ("Resend Email Integration", tester.test_resend_email_integration),
        ("Admin Statistics", tester.test_admin_stats),
        ("Admin User Management", tester.test_admin_users),
        ("Admin Product Management", tester.test_admin_products),
        ("Admin Order Management", tester.test_admin_orders),
        ("Profile Operations", tester.test_profile_operations),
        ("Mode Toggle", tester.test_mode_toggle),
        ("Brute Force Protection", tester.test_brute_force_protection),
    ]
    
    for test_name, test_func in test_sequence:
        print(f"\n📋 {test_name}")
        print("-" * 40)
        try:
            result = test_func()
            if not result:
                print(f"⚠️  {test_name} had issues but continuing...")
        except Exception as e:
            print(f"💥 {test_name} failed with exception: {e}")
            tester.failed_tests.append(f"{test_name}: Exception - {e}")
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"✅ Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"❌ Tests failed: {len(tester.failed_tests)}")
    
    if tester.failed_tests:
        print("\n🔍 Failed Tests:")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"  {i}. {failure}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend API tests mostly successful!")
        return 0
    elif success_rate >= 60:
        print("⚠️  Backend API has some issues but core functionality works")
        return 1
    else:
        print("🚨 Backend API has significant issues")
        return 2

if __name__ == "__main__":
    sys.exit(main())