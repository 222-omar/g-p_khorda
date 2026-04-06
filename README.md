# 4Sale — Marketplace for Used Items & Scrap in Egypt 🇪🇬

A full-stack marketplace platform built as a graduation project, enabling users to **buy, sell, and auction** used items and scrap across Egypt. The platform features a Django REST Framework backend, a Next.js 14 frontend, and a YOLO-powered AI layer for automatic image classification and smart bidding agents.

---

## 🚀 Features

### 🛒 Marketplace
- Browse, search, and filter product listings by category, price range, and condition
- Sectioned homepage store: **Active Auctions → Recommended → Latest → All Products**
- Product detail pages with full seller info, images, and contact
- Relative timestamps on every card (e.g. "منذ دقيقتين")
- Owners cannot wishlist their own products

### 🔨 Live Auctions
- Create auction listings with a set end time
- Real-time countdown timer on product cards and detail pages
- Place bids — must exceed current bid
- Auto-close expired auctions + auto-notify the winner via in-app chat
- Owners **cannot** bid on their own auctions (backend enforced)

### 🤖 AI Auto-Bidder Agent (`/agent`)
- Users configure personal AI agents that watch for specific item types (detected by YOLO)
- Set a maximum budget; the agent automatically counter-bids on matching auctions
- Agents can be paused, resumed, or deleted
- In-app notification center for agent actions (bid placed, outbid, won)

### 🧠 AI Image Classification
- Upload a product image during listing creation
- YOLO model (`ai/classifier.py`) detects the item type and auto-fills the category
- Supports: electronics, furniture, scrap metals, cars, books, real estate, and more

### 🔍 Hybrid RAG Smart Search (`/search`)
- Natural language searching in Egyptian Arabic (e.g., "عايز غسالة رخيصة")
- **Dual-Track Retrieval:**
  - **Vector Track:** Semantic search via Gemini Embeddings and pure numpy cosine similarity (no pgvector required)
  - **SQL Track:** Text-to-SQL powered by Groq (Llama-3.3-70B) for exact price/category filtering
- **Synthesis:** Llama-3.3 summarizes the merged outputs into a casual, conversational Arabic response
- Zero-downtime handling of invalid queries or empty results

### 💬 Chat System (`/messages`)
- Buyer-to-seller direct messaging per product
- Unread count badge in the navbar
- Messages auto-marked as read on conversation open
- Winner notification auto-sent via chat when auction closes

### ❤️ Wishlist (`/wishlist`)
- Add / remove products from favourites with one click
- Full wishlist page with AnimatePresence transitions

### 🏪 User Profile (`/profile`)
- View and manage your active listings
- Animated trust score progress bar
- Seller rating and total sales stats
- Edit your own listings (`/product/edit/[id]`)

### 🔐 Authentication
- JWT-based auth (access + refresh tokens stored in cookies)
- Register / Login with email **or** username
- Route protection via Next.js middleware
- Homepage (`/`) is always public — no forced login
- Logout always returns to the homepage (no redirect to `/login`)

### 🎨 UI / UX
- **Dark / Light mode** toggle (next-themes)
- **Arabic (RTL) / English (LTR)** bilingual support with dictionary-based i18n
- **Framer Motion** animations throughout: page transitions, stagger reveals, spring hovers
- **Typewriter effect** on the hero heading with blinking cursor
- Floating particle decorations on the hero section
- Animated section headers on the store page
- Count-up animations on statistics section

---

## 📁 Project Structure

```
G-P-PROJECT/
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                 # Public landing page (Hero, Categories, Features, Stats)
│   ├── dashboard/page.tsx       # Sectioned product store with sidebar filters
│   ├── auctions/page.tsx        # Live auctions listing
│   ├── product/
│   │   ├── [id]/page.tsx        # Product detail + bidding
│   │   └── edit/[id]/page.tsx   # Edit own listing
│   ├── sell/page.tsx            # Create new listing (with AI image classification)
│   ├── profile/page.tsx         # User profile & listings
│   ├── wishlist/page.tsx        # Saved products
│   ├── messages/page.tsx        # Chat conversations
│   ├── agent/page.tsx           # AI auto-bidder agent management
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── navbar.tsx           # Sticky navbar with unread badge, theme & language toggles
│   │   └── footer.tsx
│   ├── providers/
│   │   ├── auth-provider.tsx    # JWT auth context (login / logout / refreshUser)
│   │   ├── language-provider.tsx# i18n context (Arabic / English, RTL/LTR)
│   │   └── theme-provider.tsx   # Dark/Light mode
│   ├── sections/
│   │   ├── hero.tsx             # Typewriter heading + floating particles
│   │   ├── categories.tsx       # Animated category grid
│   │   ├── features.tsx         # Feature cards with stagger animation
│   │   └── stats.tsx            # Count-up animated statistics
│   └── ui/
│       ├── product-card.tsx     # Card with relative time, wishlist button, auction badge
│       ├── auction-timer.tsx    # Live countdown timer
│       └── sidebar-filters.tsx  # Category / price / condition filters
│
├── lib/
│   ├── api.ts                   # All API calls (products, auth, auctions, chat, agent…)
│   ├── animations.ts            # Shared Framer Motion variants
│   ├── types.ts                 # TypeScript interfaces
│   └── i18n/
│       └── dictionaries.ts      # AR + EN translation strings
│
├── middleware.ts                 # Route protection + auth redirect logic
│
└── backend/                     # Django REST Framework API
    ├── marketplace/
    │   ├── models.py            # Product, Auction, Bid, Conversation, Message,
    │   │                        # Wishlist, UserAgent, Notification, UserProfile
    │   ├── serializers.py       # DRF serializers + agent_counter_bid logic
    │   ├── views.py             # All API endpoints (products, auctions, chat,
    │   │                        # wishlist, agent, notifications, stats)
    │   └── urls.py              # URL routing
    └── ai/
        └── classifier.py        # YOLO-based image classifier + agent target list
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| Theme | next-themes |
| Backend Framework | Django + Django REST Framework |
| Auth | JWT (SimpleJWT) |
| AI / ML | YOLO (Ultralytics) |
| Database | SQLite (dev) |
| Package Manager | npm / pip |

---

## 📦 Installation

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

## 🌐 Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Create `backend/.env` for the Django backend (SECRET_KEY, DEBUG, etc.)

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login (username or email) |
| GET | `/api/auth/me/` | Current user profile |
| GET/POST | `/api/products/` | List / create products |
| GET/PATCH | `/api/products/{id}/` | Product detail / edit |
| GET | `/api/products/my_listings/` | Owner's own listings |
| GET | `/api/auctions/` | All auctions |
| POST | `/api/auctions/{id}/place_bid/` | Place a bid |
| GET/POST | `/api/conversations/` | Chat conversations |
| POST | `/api/conversations/start_conversation/` | Start chat with seller |
| POST | `/api/conversations/{id}/send_message/` | Send message |
| GET | `/api/conversations/unread_count/` | Unread messages count |
| POST | `/api/wishlist/toggle/{id}/` | Toggle wishlist |
| GET | `/api/wishlist/ids/` | Wishlisted product IDs |
| POST | `/api/classify-image/` | YOLO image classification |
| GET/POST | `/api/agents/` | List / create AI agents |
| PATCH/DELETE | `/api/agents/{id}/` | Update / delete agent |
| GET | `/api/agent-targets/` | Available YOLO target items |
| GET | `/api/notifications/` | User notifications |
| POST | `/api/notifications/mark-read/` | Mark all as read |
| GET | `/api/general-stats/` | Platform statistics |
| POST| `/api/rag/query/` | Hybrid RAG natural language search |

---

## 🌍 Internationalization

Dictionary-based i18n with full Arabic (RTL) and English (LTR) support.

```tsx
const { dict, isRtl, toggleLanguage } = useLanguage();
<p>{dict.hero.title}</p>
```

Add new strings in `lib/i18n/dictionaries.ts` — both `ar` and `en` objects.

---

## 📄 License

Graduation Project — Egypt University, 2024

## 👥 Contributors

Abdelrhman Samir & Team

---

**Built with ❤️ for a sustainable future in Egypt 🇪🇬**
