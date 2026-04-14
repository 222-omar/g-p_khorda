export interface Product {
    id: string;
    title: string;
    price: number;
    image: string;
    isAuction: boolean;
    category: 'scrap_metals' | 'electronics' | 'furniture' | 'cars' | 'real_estate' | 'other';
    description?: string;
    condition?: string;
    location?: string;
    createdAt?: string;
    seller?: {
        id: number;
        name: string;
        avatar_url: string | null;
        is_verified: boolean;
    };
    biddingHistory?: Bid[];
    endTime?: string;
    status?: string;
}

export interface Bid {
    userId: string;
    userName: string;
    amount: number;
    timestamp: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    location: string;
    walletBalance: number;
    sellerRating: number;
    trustScore: number;
    activeListings: number;
    totalSales: number;
}

export interface Category {
    id: string;
    name: string;
    icon: any;
    count: number;
}

export interface ChatParticipant {
    id: number;
    username: string;
    avatar: string | null;
}

export interface ChatMessage {
    id: number;
    conversation: number;
    sender: number;
    sender_name: string;
    sender_avatar: string | null;
    content: string;
    is_read: boolean;
    created_at: string;
}

export interface Conversation {
    id: number;
    product: number;
    product_title: string;
    product_image: string | null;
    other_participant: ChatParticipant | null;
    last_message: {
        content: string;
        sender_name: string;
        created_at: string;
        is_read: boolean;
    } | null;
    unread_count: number;
    buyer?: any;
    seller?: any;
    messages?: ChatMessage[];
    created_at: string;
    updated_at: string;
}
