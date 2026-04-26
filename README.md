# 4Sale - Marketplace for Used Items & Scrap in Egypt

A full-stack marketplace platform built as a graduation project, enabling users to buy, sell, and auction used items and scrap across Egypt. The platform features a Django REST Framework backend, a Next.js 14 frontend, and an advanced AI layer for automatic image classification, smart bidding agents, and true multimodal visual search.

---

## Features

### Marketplace
- Browse, search, and filter product listings by category, price range, and condition.
- Sectioned homepage store: Active Auctions, Recommended, Latest, All Products.
- Product detail pages with full seller info, images, and contact.
- Relative timestamps on every card.
- Owners cannot wishlist their own products.

### Live Auctions
- Create auction listings with a set end time.
- Real-time countdown timer on product cards and detail pages.
- Place bids (must exceed current bid).
- Auto-close expired auctions and auto-notify the winner via in-app chat.
- Owners cannot bid on their own auctions.

### AI Auto-Bidder Agent (/agent)
- Users configure personal AI agents that watch for specific item types.
- Set a maximum budget; the agent automatically counter-bids on matching auctions.
- Agents can be paused, resumed, or deleted.
- In-app notification center for agent actions (bid placed, outbid, won).

### AI Image Classification
- Upload a product image during listing creation.
- YOLO model detects the item type and auto-fills the category.
- Supports: electronics, furniture, scrap metals, cars, books, real estate, and more.

### Visual Search & Multimodal Embeddings
- True visual search powered by OpenRouter (nvidia/llama-nemotron-embed-vl-1b-v2).
- Uploaded images are converted directly into 2048-dim multimodal vectors.
- Lightning-fast and highly accurate similarity matching using pgvector inside PostgreSQL.

### Hybrid RAG Smart Search (/search)
- Natural language searching in Egyptian Arabic.
- Dual-Track Retrieval: 
  - Vector Track: Semantic search via Gemini Embeddings and cosine similarity.
  - SQL Track: Text-to-SQL powered by Groq (Llama-3) for exact price and category filtering.
- Llama-3 summarizes the merged outputs into a casual, conversational Arabic response.
- Zero-downtime handling of invalid queries or empty results.

### Chat System (/messages)
- Buyer-to-seller direct messaging per product.
- Unread count badge in the navbar.
- Messages auto-marked as read on conversation open.
- Winner notification auto-sent via chat when auction closes.

### Wishlist (/wishlist)
- Add or remove products from favourites with one click.
- Full wishlist page with fluid transitions.

### User Profile (/profile)
- View and manage your active listings.
- Animated trust score progress bar.
- Seller rating and total sales stats.
- Edit your own listings.

### Authentication
- JWT-based auth (access and refresh tokens stored in cookies).
- Register and Login with email or username.
- Route protection via Next.js middleware.
- Homepage is always public.

### UI / UX
- Dark and Light mode toggle.
- Arabic (RTL) and English (LTR) bilingual support with dictionary-based i18n.
- Framer Motion animations throughout: page transitions, stagger reveals, spring hovers.
- Typewriter effect on the hero heading with blinking cursor.
- Floating particle decorations on the hero section.
- Animated section headers on the store page.
- Count-up animations on statistics section.

---

## Project Structure

```text
G-P-PROJECT/
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                  # Public landing page
│   ├── dashboard/page.tsx        # Sectioned product store with sidebar filters
│   ├── auctions/page.tsx         # Live auctions listing
│   ├── product/
│   │   ├── [id]/page.tsx         # Product detail + bidding
│   │   └── edit/[id]/page.tsx    # Edit own listing
│   ├── sell/page.tsx             # Create new listing (with AI image classification)
│   ├── visual-search/page.tsx    # Upload image to find similar products
│   ├── profile/page.tsx          # User profile & listings
│   ├── wishlist/page.tsx         # Saved products
│   ├── messages/page.tsx         # Chat conversations
│   ├── agent/page.tsx            # AI auto-bidder agent management
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── components/                   # UI Components, Layouts, Providers, and Sections
├── lib/                          # API calls, Types, Framer variants, i18n dictionaries
├── middleware.ts                 # Route protection logic
│
└── backend/                      # Django REST Framework API
    ├── marketplace/              # Core app: Products, Auctions, Bids, Chat, Visual Search
    ├── rag/                      # RAG pipelines, Embeddings, Text-to-SQL
    └── ai/                       # YOLO Classifier, Multimodal Embeddings (OpenRouter/Nemotron)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Theme | next-themes |
| Backend Framework | Django + Django REST Framework |
| Database | PostgreSQL (Neon DB) with pgvector |
| Auth | JWT (SimpleJWT) |
| AI / ML | YOLO, OpenRouter (Nemotron), Groq, Gemini |

---

## Installation

### Frontend

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

The frontend runs on `http://localhost:3000`
The backend API runs on `http://localhost:8000/api`

---

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Create `backend/.env` for the Django backend containing:
- DB credentials (DATABASE_URL)
- SECRET_KEY, DEBUG
- API Keys: GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, CLOUDINARY_URL

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login (username or email) |
| GET | `/api/auth/me/` | Current user profile |
| GET/POST | `/api/products/` | List / create products |
| GET/PATCH | `/api/products/{id}/` | Product detail / edit |
| GET | `/api/auctions/` | All auctions |
| POST | `/api/auctions/{id}/place_bid/` | Place a bid |
| GET/POST | `/api/conversations/` | Chat conversations |
| POST | `/api/visual-search/` | Search similar products by image |
| POST | `/api/classify-image/` | YOLO image classification |
| GET/POST | `/api/agents/` | List / create AI agents |
| POST| `/api/rag/query/` | Hybrid RAG natural language search |

---

## Internationalization

Dictionary-based i18n with full Arabic (RTL) and English (LTR) support.
Add new strings in `lib/i18n/dictionaries.ts` for both `ar` and `en` objects.

---

## License & Contributors

Graduation Project - Egypt University, 2024
Contributors: Abdelrhman Samir & Team

Built for a sustainable future in Egypt.
