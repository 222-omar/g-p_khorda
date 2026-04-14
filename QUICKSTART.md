# 🚀 Quick Start Guide - RefurbAI

## Prerequisites
- Node.js 18.x or later
- npm or yarn
- Modern web browser

## Installation

```bash
# Navigate to project directory
cd d:\GP\refurbai

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

## 🌐 Access the Application

Once the dev server is running, open your browser and navigate to:

**http://localhost:3000**

## 📱 Testing Routes

### 1. **Landing Page**
```
http://localhost:3000/
```
**What to see:**
- Hero section with large heading in Arabic
- "Refurb**AI**" logo in top-left
- Language toggle (🌍) in navbar
- Theme toggle (🌙/☀️) in navbar
- Floating AI badge with animation
- Statistics cards (4 cards showing users, products, etc.)

### 2. **Dashboard / Shop**
```
http://localhost:3000/dashboard
```
**What to see:**
- Search bar at top
- Sidebar with filters (desktop) or filter button (mobile)
- Grid of 8 product cards
- Some products with "مزاد نشط" (Active Auction) badge
- Hover effects on product cards

### 3. **Product Detail**
```
http://localhost:3000/product/1
```
**What to see:**
- Large product image (click thumbnails to change)
- Product title and description
- Price display
- **AI Pricing Analysis** component with scanning animation
- Seller information card
- "Contact Seller" button

### 4. **Add Listing / Sell**
```
http://localhost:3000/sell
```
**What to see:**
- Multi-step form with progress indicator
- **Step 1:** Drag-and-drop zone for images
- **Step 2:** Product name, price, category fields
- **Step 3:** Description and AI notice
- "Next" and "Previous" buttons

### 5. **User Profile**
```
http://localhost:3000/profile
```
**What to see:**
- User avatar and info in sidebar
- **Trust Score** progress bar (87%)
- Wallet balance card (green gradient)
- Seller rating card (4.8 stars)
- Activity feed
- "Add New Product" button

### 6. **Login**
```
http://localhost:3000/login
```
**What to see:**
- Email and password fields
- "Forgot password?" link
- "Create New Account" link
- "Back to Home" link at bottom

## 🎨 Testing Features

### Theme Toggle
1. Click the 🌙 (moon) icon in navbar
2. Page should switch to dark mode
3. Click ☀️ (sun) icon to return to light mode

### Language Toggle
1. Click the 🌍 (Languages) icon in navbar
2. Page should switch from Arabic to English (or vice versa)
3. Notice the text direction changes (RTL ↔ LTR)

### Mobile Responsiveness
1. Resize your browser window to < 768px
2. Notice:
   - Navbar shows hamburger menu (☰)
   - Sidebar filters become a button
   - Product grid changes to 1-2 columns
   - Footer adjusts layout

### Animations to Watch
1. **Landing Page:** Hero text and image slide in from sides
2. **AI Pricing:** Scanning line animation for 2 seconds
3. **Product Cards:** Lift up on hover
4. **Add to Cart Button:** Icon rotates 90° on hover
5. **Trust Score:** Progress bar fills on page load
6. **Mobile Menu:** Slides in from right (RTL)

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or run on different port
npm run dev -- -p 3001
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Check for type errors
npx tsc --noEmit
```

## 📸 Screenshot Checklist

Take screenshots of:
- [ ] Landing page (light mode)
- [ ] Landing page (dark mode)
- [ ] Dashboard with product grid
- [ ] Product detail page with AI pricing component (during scanning)
- [ ] Product detail page with AI pricing component (after analysis)
- [ ] Sell page - Step 1 (image upload)
- [ ] Sell page - Step 2 (product info)
- [ ] Sell page - Step 3 (description)
- [ ] Profile page with trust score
- [ ] Login page
- [ ] Mobile view of any page

## 🎯 Key Interactions to Test

### 1. **Product Flow**
1. Start on landing page
2. Click "تصفح المنتجات" (Browse Products)
3. See dashboard with products
4. Click on any product card
5. View product details with AI pricing
6. Click "العودة للمتجر" (Back to Shop)

### 2. **Selling Flow**
1. Go to `/sell` page
2. Drag an image to upload zone (or click to select)
3. Click "Next" button
4. Fill in product name and price
5. Click "Next" again
6. Fill in description
7. Click "Publish" button (redirects to dashboard)

### 3. **Filter Testing**
1. Go to dashboard
2. Click "تصفية النتائج" (Filter Results) on mobile or use sidebar on desktop
3. Check a category (e.g., إلكترونيات)
4. Notice the filter is applied
5. Click "مسح الكل" (Clear All) to reset

### 4. **Search**
1. On dashboard page
2. Type in search box (e.g., "ثلاجة")
3. Click search button (magnifying glass)
4. (Note: This is UI-only in current version)

## ✅ Feature Verification

| Feature | Location | Status |
|---------|----------|--------|
| Dark/Light Mode | All pages | ✅ Working |
| Arabic/English Toggle | All pages | ✅ Working |
| Responsive Layout | All pages | ✅ Working |
| AI Pricing Animation | Product detail | ✅ Working |
| Auction Timer | Product detail | ✅ Working |
| Multi-step Form | Sell page | ✅ Working |
| Drag-and-Drop Upload | Sell page | ✅ Working |
| Trust Score Animation | Profile page | ✅ Working |
| Product Hover Effects | Dashboard | ✅ Working |
| Mobile Menu | All pages (mobile) | ✅ Working |

## 📊 Performance Tips

### Development Mode
- Turbopack is enabled for faster hot-reload
- Changes to components reflect immediately
- CSS changes are instant

### Production Build
```bash
npm run build
npm start
```
This creates an optimized build with:
- Minified JavaScript
- Optimized images
- Tree-shaking for smaller bundle size

## 🎨 Customization Examples

### Change Primary Color
Edit `tailwind.config.ts`:
```typescript
colors: {
  primary: {
    DEFAULT: '#0066FF', // New color
    // ... update other shades
  }
}
```

### Add New Translation
Edit `lib/i18n/dictionaries.ts`:
```typescript
export const dictionaries = {
  ar: {
    myNewKey: 'النص بالعربية',
  },
  en: {
    myNewKey: 'Text in English',
  }
}
```

### Add New Product
Edit `app/dashboard/page.tsx`:
```typescript
const mockProducts: Product[] = [
  // ... existing products
  {
    id: '9',
    title: 'منتج جديد',
    price: 1000,
    image: 'https://images.unsplash.com/...',
    isAuction: false,
    category: 'electronics',
  },
];
```

## 🆘 Support

If you encounter any issues:
1. Check the console for error messages (F12 in browser)
2. Review the terminal output where `npm run dev` is running
3. Ensure all dependencies are installed: `npm install`
4. Try clearing cache: `rm -rf .next`

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Happy Testing! 🚀**
