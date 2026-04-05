# StudentMarket - Student Buy/Sell Platform PRD

## Original Problem Statement
Student-focused buy/sell marketplace platform similar to Amazon. Features landing page, login/signup, home with buy/sell toggle, product listings with admin approval, search by product/college/area, local pickup or delivery (COD), real-time chat between buyer and seller, admin dashboard with CRUD/revenue graphs.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor) + WebSocket chat
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Auth**: JWT (httpOnly cookies + localStorage fallback)
- **Storage**: Emergent Object Storage for product images
- **Design**: Neo-brutalist (black borders, yellow accents, Clash Display + IBM Plex Sans fonts)

## User Personas
1. **Student (Normal User)**: Can switch between buy/sell modes, list products, browse/search, chat with sellers, place COD orders
2. **Admin**: Dashboard with stats, revenue graphs, user management, product approval/rejection, order management

## Core Requirements
- JWT auth with admin seeding
- Buy/Sell toggle mode
- Product CRUD with image upload
- Admin approval workflow for products
- Multi-keyword search (product name, college, area)
- Real-time WebSocket chat
- COD order placement (local pickup or delivery)
- Admin dashboard with stats, revenue charts, CRUD

## What's Been Implemented (April 5, 2026)
- Full backend API (auth, products, orders, chat, admin, upload, search)
- Landing page with hero, categories, features sections
- Login/Register with JWT auth
- Home page with buy/sell toggle
- Product listing with search, category filters, sorting
- Product creation form with image upload
- Product detail page with chat/order actions
- Real-time WebSocket chat
- Order system (COD, local/delivery)
- Admin dashboard (overview stats, revenue chart, users/products/orders management)
- Profile page with editable fields
- Neo-brutalist design system (black + yellow)

## Phase 2 Features (April 5, 2026)
- Product ratings/reviews system (1-5 star ratings with comments)
- Password reset flow (forgot-password + reset-password with Resend email integration)
- Email notifications for order placement and status updates (Resend, falls back to console logging)
- Enhanced search with price range filters (min/max price inputs)
- Campus Groups: auto-created groups by college name + user-created custom groups with group product feeds

## Phase 3 Features (April 5, 2026)
- Resend API key configured for live email delivery
- Wishlist/favorites: heart icons on product cards + product detail, dedicated wishlist page, nav link
- All 54 backend API tests passing (100%)
### P0 (Critical)
- None remaining

### P1 (Important)
- Resend API key integration for live email delivery
- Wishlist/favorites feature
- Order tracking timeline

### P2 (Nice to have)
- Product image gallery (multiple image zoom)
- Seller analytics dashboard
- Push notifications
- Group chat within campus groups

## Next Tasks
- Add product ratings/reviews
- Implement password reset
- Add notification system
- Enhanced search with price range filter
