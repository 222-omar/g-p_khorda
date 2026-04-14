# 📦 Component Reference Guide

A comprehensive guide to all components in the RefurbAI application.

---

## 🗂️ Component Categories

### 1. Layout Components (`components/layout/`)
### 2. Provider Components (`components/providers/`)
### 3. Section Components (`components/sections/`)
### 4. UI Components (`components/ui/`)

---

## 📍 Layout Components

### `navbar.tsx`
**Purpose:** Main navigation bar with theme and language controls

**Features:**
- Sticky positioning on scroll
- Logo with hover animation
- Desktop navigation menu (Home, Shop, Auctions)
- Language toggle button (AR ↔ EN)
- Theme toggle button (☀️ ↔ 🌙)
- Authentication state detection
- Mobile hamburger menu with slide-out drawer
- Responsive design with breakpoints

**Props:** None (uses Context)

**Usage:**
```tsx
import { Navbar } from '@/components/layout/navbar';

<Navbar />
```

**Key States:**
- `mobileMenuOpen`: Boolean for mobile menu visibility
- `isLoggedIn`: Authentication status (currently hardcoded)

---

### `footer.tsx`
**Purpose:** Site footer with branding and copyright

**Features:**
- Centered layout
- Logo with pulse animation on hover
- Copyright text with dynamic year
- Responsive typography

**Props:** None (uses Context for translations)

**Usage:**
```tsx
import { Footer } from '@/components/layout/footer';

<Footer />
```

---

## 🔌 Provider Components

### `theme-provider.tsx`
**Purpose:** Wrapper for `next-themes` to enable dark/light mode

**Features:**
- Class-based theme switching
- Persistent theme selection (localStorage)
- System preference detection
- Smooth transitions

**Props:** Inherits from `ThemeProviderProps`

**Usage:**
```tsx
import { ThemeProvider } from '@/components/providers/theme-provider';

<ThemeProvider
  attribute="class"
  defaultTheme="light"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

**Hook:**
```tsx
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
```

---

### `language-provider.tsx`
**Purpose:** Context provider for bilingual support (AR/EN)

**Features:**
- Language state management
- RTL/LTR direction switching
- Dictionary-based translations
- Toggle function

**Context Value:**
```typescript
{
  locale: 'ar' | 'en',
  dict: Dictionary,
  toggleLanguage: () => void,
  isRtl: boolean
}
```

**Usage:**
```tsx
import { LanguageProvider, useLanguage } from '@/components/providers/language-provider';

// In layout
<LanguageProvider>
  {children}
</LanguageProvider>

// In component
const { dict, locale, isRtl, toggleLanguage } = useLanguage();
```

---

## 📄 Section Components

### `hero.tsx`
**Purpose:** Landing page hero section with call-to-action

**Features:**
- Animated text entrance (slide from sides)
- Gradient text effect on title highlight
- Floating AI badge with pulsating animation
- Progress bars with staggered fill
- Responsive two-column grid
- CTA buttons with hover effects

**Props:** None (uses Context)

**Animations:**
- Initial fade-in and slide
- Staggered delays for each element
- Badge rotation and scale pulse
- Progress bar sequential fill

**Usage:**
```tsx
import { Hero } from '@/components/sections/hero';

<Hero />
```

---

### `stats.tsx`
**Purpose:** Statistics showcase section

**Features:**
- Four stat cards (users, products, scrap, governorates)
- Icon-based design with color coding
- Hover glow effect
- Scroll-triggered entrance animation
- Responsive grid (2 cols mobile, 4 cols desktop)

**Props:** None (uses Context for translations)

**Data:**
```typescript
[
  { icon: Users, label: 'Active Users', value: '+10,000', color: 'blue' },
  { icon: Package, label: 'Products Sold', value: '+5,000', color: 'emerald' },
  { icon: Leaf, label: 'Tons of Scrap', value: '800', color: 'green' },
  { icon: MapPin, label: 'Governorates', value: '27', color: 'orange' },
]
```

**Usage:**
```tsx
import { Stats } from '@/components/sections/stats';

<Stats />
```

---

## 🎨 UI Components

### `product-card.tsx`
**Purpose:** Reusable product card for grid displays

**Features:**
- Image with hover scale effect
- Auction badge (conditional)
- Product title with line clamp
- Price display with currency
- Add to cart button with rotation animation
- Lift effect on hover
- Glassmorphism overlay on hover

**Props:**
```typescript
interface ProductCardProps {
  product: Product;
}
```

**Product Interface:**
```typescript
interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  isAuction: boolean;
  category: 'electronics' | 'furniture' | 'scrap' | 'other';
}
```

**Usage:**
```tsx
import { ProductCard } from '@/components/ui/product-card';

<ProductCard product={productData} />
```

**Animations:**
- `whileHover`: Y-axis lift (-5px)
- `initial/animate`: Fade and slide up
- Button icon: 90° rotation on hover

---

### `auction-timer.tsx`
**Purpose:** Real-time countdown timer for auction items

**Features:**
- Live countdown (updates every second)
- Dynamic time formatting (days, hours:min:sec)
- Progress bar visualization
- Pulse animation on clock icon
- Ends auction message when time is up

**Props:**
```typescript
interface AuctionTimerProps {
  endTime: string; // ISO date string
}
```

**Time Calculations:**
- Days remaining (if > 0)
- Hours:Minutes:Seconds (if < 1 day)
- Minutes:Seconds (if < 1 hour)
- Progress based on 7-day total duration

**Usage:**
```tsx
import { AuctionTimer } from '@/components/ui/auction-timer';

<AuctionTimer endTime="2026-02-15T18:00:00" />
```

**State:**
- `timeLeft`: Formatted string
- `progress`: Percentage (0-100)

---

### `ai-pricing.tsx`
**Purpose:** AI-powered price analysis component

**Features:**
- **Loading State:** Scanning animation with glassmorphism
- **Analysis State:** Market comparison and recommendations
- Two-step reveal (analysis → results)
- Color-coded recommendations (green/blue/orange)
- Confidence score progress bar
- Similar products count

**Props:**
```typescript
interface AIPricingProps {
  productPrice: number;
  productCategory: string;
}
```

**Analysis Output:**
```typescript
{
  marketAverage: number;
  yourPrice: number;
  difference: number; // Percentage
  recommendation: 'excellent' | 'good' | 'high';
  similarProducts: number;
  confidence: number; // 85-100
}
```

**Animations:**
- **Loading:** Scanning line Y-axis movement, sparkle rotation
- **Result:** Fade-in scale, progress bar fill

**Usage:**
```tsx
import { AIPricing } from '@/components/ui/ai-pricing';

<AIPricing 
  productPrice={4500} 
  productCategory="electronics" 
/>
```

**Recommendation Logic:**
- `excellent`: Within ±5% of market average
- `good`: Below market average
- `high`: Above market average

---

### `sidebar-filters.tsx`
**Purpose:** Advanced product filtering sidebar

**Features:**
- **Desktop:** Sticky sidebar
- **Mobile:** Slide-out drawer with backdrop
- Category checkboxes with counts
- Price range radio buttons
- Condition checkboxes
- Auction-only toggle
- Clear all filters button
- Smooth animations

**Props:** None (manages own state)

**Filter Options:**
```typescript
Categories: [
  { id: 'electronics', label: 'إلكترونيات', count: 245 },
  { id: 'furniture', label: 'أثاث', count: 182 },
  { id: 'scrap', label: 'خردة', count: 523 },
  { id: 'other', label: 'أخرى', count: 89 },
]

Price Ranges: [
  { id: 'under-1000', label: 'أقل من 1000 ج.م', min: 0, max: 1000 },
  { id: '1000-5000', label: '1000 - 5000 ج.م', min: 1000, max: 5000 },
  { id: '5000-10000', label: '5000 - 10000 ج.م', min: 5000, max: 10000 },
  { id: 'over-10000', label: 'أكثر من 10000 ج.م', min: 10000, max: Infinity },
]

Conditions: [
  { id: 'new', label: 'جديد' },
  { id: 'like-new', label: 'كالجديد' },
  { id: 'good', label: 'جيد' },
  { id: 'fair', label: 'مقبول' },
]
```

**State:**
```typescript
const [isOpen, setIsOpen] = useState(false); // Mobile drawer
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
const [showAuctionsOnly, setShowAuctionsOnly] = useState(false);
```

**Usage:**
```tsx
import { SidebarFilters } from '@/components/ui/sidebar-filters';

<SidebarFilters />
```

**Mobile Drawer Animation:**
- Backdrop: Fade in/out
- Drawer: Slide from right (RTL) with spring physics

---

## 🔧 Utility Functions

### `toggleCategory(id: string)` (in sidebar-filters)
Adds or removes category from selected array

### `toggleCondition(id: string)` (in sidebar-filters)
Adds or removes condition from selected array

### `clearFilters()` (in sidebar-filters)
Resets all filter states to default

---

## 🎯 Common Patterns

### Using Language Context
```tsx
const { dict, locale, isRtl } = useLanguage();

<p>{dict.hero.title}</p>
<div className={isRtl ? 'text-right' : 'text-left'}>
```

### Using Theme
```tsx
const { theme, setTheme } = useTheme();

<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</button>
```

### Framer Motion Entrance
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {content}
</motion.div>
```

### Responsive Classes
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
```

---

## 📚 Component Dependencies

```
Navbar
├── useTheme (next-themes)
├── useLanguage (custom)
├── Lucide icons
└── Framer Motion

ProductCard
├── Product type
├── useLanguage
├── Framer Motion
└── Next Link

AIPricing
├── useState, useEffect
├── Framer Motion
└── Lucide icons

AuctionTimer
├── useState, useEffect
├── Framer Motion
└── Lucide icons

SidebarFilters
├── useState
├── Framer Motion (AnimatePresence)
└── Lucide icons
```

---

## 🎨 Styling Conventions

### Card Pattern
```tsx
<div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
```

### Button Primary
```tsx
<button className="bg-primary hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg">
```

### Button Secondary
```tsx
<button className="border-2 border-slate-300 dark:border-slate-700 px-8 py-4 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
```

### Input Field
```tsx
<input className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all" />
```

---

## 🚀 Performance Notes

- All components use React best practices
- Framer Motion animations are GPU-accelerated
- Images should be optimized (use `next/image` in production)
- Components are tree-shakeable
- No prop drilling (Context providers used)

---

## 🔮 Future Component Ideas

- `<BiddingHistory />`: Show auction bid history
- `<ChatWidget />`: Buyer-seller messaging
- `<ReviewCard />`: User reviews and ratings
- `<NotificationBell />`: Real-time notifications
- `<CompareProducts />`: Side-by-side comparison
- `<WishlistButton />`: Save products for later
- `<ShareButton />`: Social media sharing
- `<ReportListing />`: Flag inappropriate content

---

**Last Updated:** February 9, 2026  
**Version:** 1.0.0
