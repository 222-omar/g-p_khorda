# 🚀 RefurbAI API Quick Reference

## Base URL
```
http://localhost:8000/api
```

## 🔐 Authentication Endpoints

### Register
```http
POST /auth/register/
Content-Type: application/json

{
  "username": "ahmed",
  "email": "ahmed@example.com",
  "password": "securepass123",
  "password2": "securepass123",
  "first_name": "Ahmed",
  "last_name": "Mohamed",
  "city": "Cairo",
  "phone": "01234567890"
}

Response: {
  "user": {...},
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

### Login
```http
POST /auth/login/
Content-Type: application/json

{
  "username": "ahmed",
  "password": "securepass123"
}

Response: {
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Current User
```http
GET /auth/me/
Authorization: Bearer {access_token}

Response: {
  "id": 1,
  "user": {...},
  "phone": "01234567890",
  "city": "Cairo",
  "trust_score": 87,
  "is_verified": true,
  "wallet_balance": "1500.00",
  "seller_rating": "4.80",
  "total_sales": 32
}
```

---

## 📦 Products Endpoints

### List Products
```http
GET /products/
GET /products/?category=electronics
GET /products/?min_price=1000&max_price=5000
GET /products/?search=laptop
GET /products/?is_auction=true
GET /products/?auctions_only=true
GET /products/?page=2

Response: {
  "count": 150,
  "next": "http://localhost:8000/api/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": "1",
      "title": "ثلاجة توشيبا ١٤ قدم",
      "price": "4500.00",
      "category": "electronics",
      "condition": "good",
      "status": "active",
      "location": "Cairo, Egypt",
      "is_auction": false,
      "primary_image": "http://localhost:8000/media/products/image.jpg",
      "owner_name": "ahmed",
      "views_count": 45,
      "created_at": "2026-02-09T10:30:00Z"
    },
    ...
  ]
}
```

### Get Product Detail
```http
GET /products/{id}/

Response: {
  "id": "1",
  "owner": {
    "id": 1,
    "username": "ahmed",
    "email": "ahmed@example.com",
    "first_name": "Ahmed",
    "last_name": "Mohamed"
  },
  "owner_profile": {
    "trust_score": 87,
    "seller_rating": 4.8,
    "total_sales": 32,
    "city": "Cairo",
    "avatar": "http://localhost:8000/media/avatars/avatar.jpg"
  },
  "title": "ثلاجة توشيبا ١٤ قدم",
  "description": "ثلاجة بحالة ممتازة...",
  "price": "4500.00",
  "category": "electronics",
  "condition": "good",
  "status": "active",
  "location": "Cairo, Egypt",
  "is_auction": false,
  "views_count": 45,
  "images": [
    {
      "id": 1,
      "image": "http://localhost:8000/media/products/image1.jpg",
      "is_primary": true,
      "order": 0
    },
    ...
  ],
  "auction": null,
  "ai_analysis": {
    "market_average": "4200.00",
    "price_difference": "7.14",
    "recommendation": "excellent",
    "similar_products_count": 23,
    "confidence_score": 92
  },
  "created_at": "2026-02-09T10:30:00Z",
  "updated_at": "2026-02-09T10:30:00Z"
}
```

### Create Product
```http
POST /products/
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

{
  "title": "لابتوب ديل مستعمل",
  "description": "لابتوب بحالة ممتازة...",
  "price": 6500,
  "category": "electronics",
  "condition": "good",
  "location": "Cairo, Egypt",
  "is_auction": false,
  "uploaded_images": [File, File, ...]
}

Response: {
  "id": "9",
  "title": "لابتوب ديل مستعمل",
  ...
}
```

### Update Product
```http
PATCH /products/{id}/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "price": 6000,
  "status": "sold"
}

Response: Updated product object
```

### Delete Product
```http
DELETE /products/{id}/
Authorization: Bearer {access_token}

Response: 204 No Content
```

### Get AI Price Analysis
```http
GET /products/{id}/ai_analysis/

Response: {
  "id": 1,
  "market_average": "4200.00",
  "price_difference": "7.14",
  "recommendation": "excellent",
  "similar_products_count": 23,
  "confidence_score": 92,
  "created_at": "2026-02-09T10:30:00Z"
}
```

### Get My Listings
```http
GET /products/my_listings/
Authorization: Bearer {access_token}

Response: [...list of user's products...]
```

---

## 🏺 Auctions Endpoints

### List Auctions
```http
GET /auctions/
GET /auctions/?active_only=true

Response: [
  {
    "id": 1,
    "starting_bid": "2000.00",
    "current_bid": "2500.00",
    "highest_bidder": 3,
    "highest_bidder_name": "mohamed",
    "end_time": "2026-02-15T18:00:00Z",
    "is_active": true,
    "bids": [
      {
        "id": 1,
        "bidder": 3,
        "bidder_name": "mohamed",
        "bidder_avatar": "http://localhost:8000/media/avatars/avatar.jpg",
        "amount": "2500.00",
        "created_at": "2026-02-09T12:00:00Z"
      },
      ...
    ]
  },
  ...
]
```

### Get Auction Detail
```http
GET /auctions/{id}/

Response: Single auction object with bids
```

### Place Bid
```http
POST /auctions/{id}/place_bid/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "amount": 2600
}

Response: {
  "id": 5,
  "auction": 1,
  "bidder": 1,
  "bidder_name": "ahmed",
  "amount": "2600.00",
  "created_at": "2026-02-09T14:30:00Z"
}
```

---

## 👤 Profiles Endpoints

### Get My Profile
```http
GET /profiles/me/
Authorization: Bearer {access_token}

Response: {
  "id": 1,
  "user": {
    "id": 1,
    "username": "ahmed",
    "email": "ahmed@example.com",
    "first_name": "Ahmed",
    "last_name": "Mohamed"
  },
  "phone": "01234567890",
  "city": "Cairo",
  "trust_score": 87,
  "is_verified": true,
  "avatar": "http://localhost:8000/media/avatars/avatar.jpg",
  "wallet_balance": "1500.00",
  "total_sales": 32,
  "seller_rating": "4.80",
  "created_at": "2026-01-15T10:00:00Z"
}
```

### Update Profile
```http
PATCH /profiles/me/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "phone": "01111111111",
  "city": "Alexandria"
}

Response: Updated profile object
```

---

## 📋 Field Reference

### Product Categories
- `electronics`
- `furniture`
- `scrap`
- `other`

### Product Conditions
- `new`
- `like-new`
- `good`
- `fair`

### Product Status
- `active`
- `sold`
- `pending`
- `inactive`

### AI Recommendations
- `excellent` - Price is within ±5% of market average
- `good` - Price is below market average
- `high` - Price is above market average

---

## 🔑 Authentication Header Format

All protected endpoints require:
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

---

## ⚠️ Error Responses

```json
{
  "detail": "Authentication credentials were not provided."
}
```

```json
{
  "error": "Bid must be higher than current bid of 2500.00"
}
```

```json
{
  "username": ["A user with that username already exists."]
}
```

---

## 🧪 Testing with curl

```bash
# Login and save token
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"ahmed","password":"pass123"}' \
  | jq -r '.access')

# Use token to get products
curl http://localhost:8000/api/products/ \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📦 Rate Limiting
- Currently: **No rate limiting** (development)
- Production: Implement with Django Rate Limit

---

**Quick Reference v1.0 - RefurbAI API**
