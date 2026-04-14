# 🚀 RefurbAI Full-Stack Setup Guide

Complete guide for setting up and running the RefurbAI marketplace application with Django backend and Next.js frontend.

---

## 📋 Prerequisites

- **Node.js** 18.x or later
- **Python** 3.10 or later
- **PostgreSQL** 13 or later (optional - SQLite used by default for development)
- **pip** (Python package manager)
- **npm** or **yarn**

---

## 🗂️ Project Structure

```
refurbai/
├── backend/                    # Django REST Framework Backend
│   ├── marketplace/           # Main app
│   │   ├── models.py         # Database models
│   │   ├── serializers.py    # DRF serializers
│   │   ├── views.py          # API views
│   │   ├── urls.py           # API routes
│   │   └── admin.py          # Admin configuration
│   ├── refurbai_backend/     # Project settings
│   │   ├── settings.py       # Django settings
│   │   └── urls.py           # Main URL config
│   ├── venv/                 # Python virtual environment
│   ├── manage.py             # Django management script
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables
│
├── app/                       # Next.js Frontend (App Router)
├── components/               # React components
├── lib/                      # Utilities and API client
│   ├── api.ts               # Django API client
│   ├── types.ts             # TypeScript types
│   └── i18n/                # Translations
├── .env.local               # Frontend environment variables
└── package.json             # Node dependencies
```

---

## ⚙️ Backend Setup (Django)

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Virtual Environment
```bash
python -m venv venv
```

### 3. Activate Virtual Environment

**WindOWS:**
```powershell
.\venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
# For development, SQLite is used by default
# To use PostgreSQL, set USE_POSTGRES=True and configure DB settings

SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# If using PostgreSQL:
USE_POSTGRES=True
DB_NAME=refurbai_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### 6. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Create Superuser (Admin)
```bash
python manage.py createsuperuser
```

Follow prompts to set username, email, and password.

### 8. Create Media Directories
```bash
mkdir media
mkdir media/products
mkdir media/avatars
```

### 9. Start Django Server
```bash
python manage.py runserver 8000
```

Backend will be available at: **http://localhost:8000**

API endpoint: **http://localhost:8000/api/**

Admin panel: **http://localhost:8000/admin/**

---

## 🎨 Frontend Setup (Next.js)

### 1. Navigate to Root Directory
```bash
cd ..  # From backend folder
# or
cd d:\GP\refurbai
```

### 2. Install Dependencies
```bash
npm install
``

### 3. Configure Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 4. Start Development Server
```bash
npm run dev
```

Frontend will be available at: **http://localhost:3000**

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login (JWT)
- `POST /api/auth/refresh/` - Refresh access token
- `GET /api/auth/me/` - Get current user

### Products
- `GET /api/products/` - List all products
- `GET /api/products/{id}/` - Get product details
- `POST /api/products/` - Create product (auth required)
- `PATCH /api/products/{id}/` - Update product (owner only)
- `DELETE /api/products/{id}/` - Delete product (owner only)
- `GET /api/products/{id}/ai_analysis/` - Get AI price analysis
- `GET /api/products/my_listings/` - Get user's products

### Auctions
- `GET /api/auctions/` - List all auctions
- `GET /api/auctions/{id}/` - Get auction details
- `POST /api/auctions/{id}/place_bid/` - Place a bid (auth required)

### Profiles
- `GET /api/profiles/me/` - Get current user profile
- `PATCH /api/profiles/me/` - Update profile

---

## 🔑 Authentication Flow

### 1. Register New User

```typescript
import { authAPI } from '@/lib/api';

const result = await authAPI.register({
  username: 'ahmed',
  email: 'ahmed@example.com',
  password: 'securepassword',
  password2: 'securepassword',
  city: 'Cairo',
  phone: '01234567890'
});

// Tokens are automatically stored in cookies
```

### 2. Login

```typescript
const tokens = await authAPI.login('ahmed', 'securepassword');
// Access and refresh tokens stored in cookies
```

### 3. Access Protected Routes

```typescript
import { productsAPI } from '@/lib/api';

// Token automatically included from cookies
const myProducts = await productsAPI.getMyListings();
```

### 4. Logout

```typescript
authAPI.logout();
// Clears auth cookies
```

---

## 🗄️ Database Models

### UserProfile
- Extends Django User with trust_score, location, verification status
- Fields: phone, city, trust_score, is_verified, wallet_balance, seller_rating

### Product
- Main marketplace item
- Fields: title, description, price, category, condition, status, location
- Categories: electronics, furniture, scrap, other
- Conditions: new, like-new, good, fair
- Status: active, sold, pending, inactive

### ProductImage
- Multiple images per product
- Fields: image, is_primary, order

### Auction
- One-to-one with Product
- Fields: current_bid, highest_bidder, end_time, is_active

### Bid
- Individual bids on auctions
- Fields: bidder, amount, created_at

### AIPriceAnalysis
- AI-generated price recommendations
- Fields: market_average, price_difference, recommendation, confidence_score

---

## 🧪 Testing the API

### Using Django Admin
1. Go to http://localhost:8000/admin/
2. Login with superuser credentials
3. Add products, users, auctions manually

### Using API Client (Recommended)

Create test data via frontend:
1. Register a new user
2. Login
3. Go to `/sell` page
4. Create a product listing
5. View it on `/dashboard`

### Using curl

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "password2": "testpass123",
    "city": "Cairo"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'

# List products
curl http://localhost:8000/api/products/
```

---

## 🔧 Common Issues & Solutions

### Backend Issues

**Issue: ModuleNotFoundError**
```bash
# Solution: Ensure virtual environment is activated
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
```

**Issue: PostgreSQL connection error**
```bash
# Solution: Use SQLite for development
# In .env, remove or set: USE_POSTGRES=False
```

**Issue: CORS errors**
```bash
# Solution: Ensure django-cors-headers is installed and configured
# Check settings.py has CORS_ALLOW_ALL_ORIGINS=True for development
```

### Frontend Issues

**Issue: API connection refused**
```bash
# Solution: Ensure Django server is running on port 8000
# Check .env.local has: NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Issue: Next.js build fails**
```bash
# Solution: Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 📦 Production Deployment

### Backend (Django)

1. Set `DEBUG=False` in `.env`
2. Configure proper `ALLOWED_HOSTS`
3. Use PostgreSQL database
4. Collect static files:
   ```bash
   python manage.py collectstatic
   ```
5. Use Gunicorn/uWSGI for production server
6. Set up Nginx as reverse proxy

### Frontend (Next.js)

1. Build production bundle:
   ```bash
   npm run build
   ```
2. Deploy to Vercel, Netlify, or custom server:
   ```bash
   npm start
   ```
3. Update `NEXT_PUBLIC_API_URL` to production API URL

---

## 🎯 Next Steps

1. ✅ Backend API is fully functional
2. ✅ Frontend integrated with API client
3. 🔄 Update Next.js pages to fetch from API
4. 🔄 Implement real authentication state management
5. 🔄 Add image upload functionality
6. 🔄 Implement real-time auction updates (WebSocket)

---

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [JWT Authentication](https://django-rest-framework-simplejwt.readthedocs.io/)

---

**Built with ❤️ for RefurbAI - Egypt's Sustainable Marketplace 🇪🇬**
