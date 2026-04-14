# API Client Usage Guide

This document shows how to use the `api.ts` client in your Next.js components.

## Import

```typescript
import { authAPI, productsAPI, auctionsAPI, profilesAPI } from '@/lib/api';
```

## Authentication

### Login
```typescript
try {
    await authAPI.login(username, password);
    // Tokens are automatically stored in cookies
    router.push('/dashboard');
} catch (error) {
    console.error('Login failed:', error.message);
}
```

### Get Current User
```typescript
try {
    const user = await authAPI.getCurrentUser();
    console.log(user.username, user.email);
} catch (error) {
    // User not logged in
}
```

### Logout
```typescript
authAPI.logout(); // Clears tokens from cookies
router.push('/');
```

## Products

### List Products (with filters)
```typescript
try {
    const response = await productsAPI.list({
        search: 'laptop',
        category: 'electronics',
        min_price: 1000,
        max_price: 5000,
        condition: 'good',
        auctions_only: false,
        page: 1
    });
    
    console.log(response.results); // Array of products
    console.log(response.count); // Total count
    console.log(response.next); // Next page URL
} catch (error) {
    console.error('Error fetching products:', error);
}
```

### Get Single Product
```typescript
try {
    const product = await productsAPI.get(productId);
    console.log(product.title, product.price);
} catch (error) {
    console.error('Product not found:', error);
}
```

### Create Product (with images)
```typescript
try {
    const formData = new FormData();
    formData.append('title', 'Product Title');
    formData.append('price', '1500');
    formData.append('category', 'electronics');
    formData.append('condition', 'good');
    formData.append('description', 'Product description');
    formData.append('location', 'Cairo');
    
    // Add images
    imageFiles.forEach(file => {
        formData.append('images', file);
    });
    
    const newProduct = await productsAPI.create(formData);
    console.log('Created product:', newProduct.id);
} catch (error) {
    console.error('Error creating product:', error);
}
```

### Update Product
```typescript
try {
    const updated = await productsAPI.update(productId, {
        price: '1800',
        description: 'Updated description'
    });
} catch (error) {
    console.error('Error updating product:', error);
}
```

### Delete Product
```typescript
try {
    await productsAPI.delete(productId);
} catch (error) {
    console.error('Error deleting product:', error);
}
```

### Get My Listings
```typescript
try {
    const myProducts = await productsAPI.getMyListings();
    console.log('My products:', myProducts);
} catch (error) {
    console.error('Error fetching listings:', error);
}
```

## Auctions

### List Auctions
```typescript
try {
    const auctions = await auctionsAPI.list(true); 
    console.log('Active auctions:', auctions);
} catch (error) {
    console.error('Error fetching auctions:', error);
}
```

### Get Auction Details
```typescript
try {
    const auction = await auctionsAPI.get(auctionId);
    console.log('Current bid:', auction.current_bid);
    console.log('End time:', auction.end_time);
} catch (error) {
    console.error('Error fetching auction:', error);
}
```

### Place Bid
```typescript
try {
    const bid = await auctionsAPI.placeBid(auctionId, bidAmount);
    console.log('Bid placed successfully!');
    // Refresh product to get updated bid
} catch (error) {
    console.error('Bid failed:', error.message);
}
```

## Profiles

### Get My Profile
```typescript
try {
    const profile = await profilesAPI.getMe();
    console.log(profile.bio, profile.avatar);
} catch (error) {
    console.error('Error fetching profile:', error);
}
```

### Update Profile
```typescript
try {
    const updated = await profilesAPI.update({
        bio: 'New bio',
        phone: '0123456789',
        city: 'Cairo'
    });
} catch (error) {
    console.error('Error updating profile:', error);
}
```

## Error Handling

All API functions throw errors with meaningful messages. Always wrap them in try-catch:

```typescript
try {
    const result = await productsAPI.list();
    setData(result.results);
    setError(null);
} catch (err: any) {
    console.error('API Error:', err);
    setError(err.message || 'An error occurred');
} finally {
    setLoading(false);
}
```

## Authentication Headers

The API client automatically:
- Includes JWT token from cookies in all authenticated requests
- Handles Content-Type headers (JSON or multipart/form-data)
- Parses error responses into readable messages

## Environment Variables

Make sure `NEXT_PUBLIC_API_URL` is set in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For production, update it to your production API URL.

## TypeScript Types

Consider creating interfaces for your data:

```typescript
interface Product {
    id: number;
    title: string;
    price: string;
    category: string;
    condition: string;
    description: string;
    location: string;
    images: { image: string }[];
    seller: {
        username: string;
        profile?: {
            avatar: string;
        };
    };
    is_auction: boolean;
    auction?: {
        id: number;
        current_bid: string;
        end_time: string;
    };
}
```

This helps with autocomplete and type safety in your components.
