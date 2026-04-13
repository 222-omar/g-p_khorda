// Centralized API Base URL
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// Helper function to enforce trailing slash for Django
export const enforceTrailingSlash = (endpoint: string): string => {
    // Prevent adding slash to query params directly and handle them separately
    if (endpoint.includes('?')) {
        const [path, query] = endpoint.split('?');
        const slashedPath = path.endsWith('/') ? path : `${path}/`;
        return `${slashedPath}?${query}`;
    }
    return endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
};

// Helper function to get auth token from cookies
const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;

    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('access_token='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
};

// Helper function to set auth token in cookies
export const setAuthToken = (token: string) => {
    document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`;
};

// Helper function to set refresh token in cookies
export const setRefreshToken = (token: string) => {
    document.cookie = `refresh_token=${token}; path=/; max-age=604800; SameSite=Lax`;
};

// Helper function to clear auth tokens
export const clearAuthTokens = () => {
    document.cookie = 'access_token=; path=/; max-age=0';
    document.cookie = 'refresh_token=; path=/; max-age=0';
};

// Global flag to prevent further API calls after auth is invalidated
let _authInvalidated = false;

// Reset auth state (called after successful login)
export const resetAuthState = () => {
    _authInvalidated = false;
};

// Generic fetch wrapper with auth
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    // If auth was invalidated, reject immediately without hitting the server
    if (_authInvalidated) {
        const error = new Error('Auth invalidated');
        (error as any).response = { data: { detail: 'Auth invalidated' }, status: 401 };
        throw error;
    }

    const token = getAuthToken();

    const headers: Record<string, string> = {};
    
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    Object.assign(headers, options.headers || {});

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const formattedEndpoint = enforceTrailingSlash(endpoint);
    const url = `${API_BASE}${formattedEndpoint.startsWith('/') ? '' : '/'}${formattedEndpoint}`;

    // Debug logging for frontend requests
    console.log(`[Frontend API Request] ${options.method || 'GET'} ${url}`);
    if (options.body) console.log(`[Frontend API Body]`, options.body);

    const response = await fetch(url, {
        ...options,
        headers,
    });

    console.log(`[Frontend API Response] ${url} Status: ${response.status}`);

    if (!response.ok) {
        if (response.status === 401) {
            // Clear invalid tokens and set global flag to stop all future requests
            clearAuthTokens();
            _authInvalidated = true;
        }
        const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));

        // Handle DRF list of errors or specific field errors
        let errorMessage = errorData.detail || errorData.message;

        if (!errorMessage && typeof errorData === 'object' && errorData !== null) {
            // If we have field-specific errors (e.g. { "username": ["Required"], "email": ["Invalid"] })
            // We join them into a string
            const messages = Object.entries(errorData)
                .map(([key, value]) => {
                    const msg = Array.isArray(value) ? value.join(', ') : String(value);
                    return `${key}: ${msg}`;
                })
                .join(' | ');

            if (messages) errorMessage = messages;
        }

        const error = new Error(errorMessage || 'Request failed');
        (error as any).response = { data: errorData, status: response.status };
        throw error;
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

// Auth API
export const authAPI = {
    async register(data: {
        username: string;
        email: string;
        password: string;
        password2: string;
        first_name?: string;
        last_name?: string;
        city: string;
        phone?: string;
    }) {
        resetAuthState(); // Allow API calls for registration
        const response = await apiFetch<{
            user: any;
            tokens: { access: string; refresh: string };
        }>('/auth/register/', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        setAuthToken(response.tokens.access);
        setRefreshToken(response.tokens.refresh);

        return response;
    },

    async login(username: string, password: string) {
        resetAuthState(); // Allow API calls for login
        const response = await apiFetch<{ access: string; refresh: string }>(
            '/auth/login/',
            {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            }
        );

        setAuthToken(response.access);
        setRefreshToken(response.refresh);

        return response;
    },

    async getCurrentUser() {
        return apiFetch<any>('/auth/me/');
    },

    logout() {
        clearAuthTokens();
    },
};

// Products API
export const productsAPI = {
    async list(params?: {
        category?: string;
        min_price?: number;
        max_price?: number;
        condition?: string;
        is_auction?: boolean;
        auctions_only?: boolean;
        owner?: string | number;
        search?: string;
        page?: number;
    }) {
        const queryParams = new URLSearchParams();

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value));
                }
            });
        }

        const query = queryParams.toString();
        return apiFetch<{ results: any[]; count: number; next: string | null; previous: string | null }>(
            `/products/${query ? `?${query}` : ''}`
        );
    },

    async get(id: string) {
        return apiFetch<any>(`/products/${id}/`);
    },

    async create(data: FormData) {
        const token = getAuthToken();

        const url = `${API_BASE}/products/`;
        console.log(`[Frontend API Request] POST ${url}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: data,
        });
        
        console.log(`[Frontend API Response] ${url} Status: ${response.status}`);

        if (response.status >= 200 && response.status < 300) {
            try {
                return await response.json();
            } catch (parseError) {
                return { success: true };
            }
        }

        const errorData = await response.json().catch(() => ({ detail: 'Failed to create product' }));
        let errorMessage = errorData.detail || errorData.message;

        if (!errorMessage && typeof errorData === 'object' && errorData !== null) {
            const messages = Object.entries(errorData)
                .map(([key, value]) => {
                    const msg = Array.isArray(value) ? value.join(', ') : String(value);
                    return `${key}: ${msg}`;
                })
                .join(' | ');
            if (messages) errorMessage = messages;
        }

        const error = new Error(errorMessage || 'Failed to create product');
        (error as any).response = { data: errorData, status: response.status };
        throw error;
    },

    async update(id: string, data: Partial<any>) {
        return apiFetch<any>(`/products/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string) {
        return apiFetch<void>(`/products/${id}/`, {
            method: 'DELETE',
        });
    },

    async getAIAnalysis(id: string) {
        return apiFetch<any>(`/products/${id}/ai_analysis/`);
    },

    async getMyListings() {
        return apiFetch<any[]>('/products/my_listings/');
    },

    async purchase(id: string) {
        return apiFetch<{ status: string; message: string; new_balance: number }>(`/products/${id}/purchase/`, {
            method: 'POST',
        });
    },
};

// Auctions API
export const auctionsAPI = {
    async list(activeOnly: boolean = false) {
        return apiFetch<any[]>(`/auctions/${activeOnly ? '?active_only=true' : ''}`);
    },

    async get(id: string) {
        return apiFetch<any>(`/auctions/${id}/`);
    },

    async placeBid(id: string, amount: number) {
        return apiFetch<any>(`/auctions/${id}/place_bid/`, {
            method: 'POST',
            body: JSON.stringify({ amount }),
        });
    },
};

export const profilesAPI = {
    async getPublicProfile(userId: string | number) {
        return apiFetch<any>(`/profiles/by_user/${userId}/`);
    },

    async rateUser(userId: string | number, rating: number) {
        return apiFetch<any>(`/profiles/rate/${userId}/`, {
            method: 'POST',
            body: JSON.stringify({ rating }),
        });
    },

    async getMe() {
        return apiFetch<any>('/profiles/me/');
    },

    async update(data: Partial<any> | FormData) {
        return apiFetch<any>('/profiles/me/', {
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    },
};

// General API
export const generalAPI = {
    async getGeneralStats() {
        return apiFetch<{
            total_users: number;
            products_sold: number;
            scrap_count: number;
            active_governorates: number;
        }>('/general-stats/');
    },
};

// Chat API
export const chatAPI = {
    async getConversations() {
        return apiFetch<any[]>('/conversations/');
    },

    async getConversation(id: number) {
        return apiFetch<any>(`/conversations/${id}/`);
    },

    async startConversation(productId: number) {
        return apiFetch<any>('/conversations/start_conversation/', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId }),
        });
    },

    async sendMessage(conversationId: number, content: string) {
        return apiFetch<any>(`/conversations/${conversationId}/send_message/`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },

    async getUnreadCount() {
        return apiFetch<{ unread_count: number }>('/conversations/unread_count/');
    },

    async deleteConversation(conversationId: number) {
        return apiFetch<any>(`/conversations/${conversationId}/delete_conversation/`, {
            method: 'DELETE',
        });
    },

    async deleteMessage(conversationId: number, messageId: number) {
        return apiFetch<any>(`/conversations/${conversationId}/delete_message/${messageId}/`, {
            method: 'DELETE',
        });
    },

    async editMessage(conversationId: number, messageId: number, content: string) {
        return apiFetch<any>(`/conversations/${conversationId}/edit_message/${messageId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ content }),
        });
    },
};

// Wishlist API
export const wishlistAPI = {
    async list() {
        return apiFetch<any[]>('/wishlist/');
    },

    async toggle(productId: number) {
        return apiFetch<{ status: string; is_wishlisted: boolean }>(`/wishlist/toggle/${productId}/`, {
            method: 'POST',
        });
    },

    async check(productId: number) {
        return apiFetch<{ is_wishlisted: boolean }>(`/wishlist/check/${productId}/`);
    },

    async getIds() {
        return apiFetch<{ product_ids: number[] }>('/wishlist/ids/');
    },
};

export const classifyAPI = {
    async classifyImage(file: File): Promise<{
        category: string;
        category_label: string;
        confidence: number;
        detected_class: string | null;
    }> {
        const formData = new FormData();
        formData.append('image', file);

        const token = getAuthToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = `${API_BASE}/classify-image/`;
        console.log(`[Frontend API Request] POST ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
        });
        
        console.log(`[Frontend API Response] ${url} Status: ${response.status}`);

        if (!response.ok) {
            throw new Error('Classification failed');
        }

        return response.json();
    },
};

// AI Agent API
export const agentAPI = {
    async getTargets() {
        return apiFetch<{ id: string; label: string; label_ar: string; category: string }[]>(
            '/agent-targets/'
        );
    },

    async list() {
        const data = await apiFetch<any>('/agents/');
        // Handle paginated (DRF) or plain array response
        return Array.isArray(data) ? data : (data.results || []);
    },

    async create(data: { target_item: string; max_budget: number; requirements_prompt?: string }) {
        return apiFetch<any>('/agents/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: number, data: Partial<{ target_item: string; max_budget: number; is_active: boolean; requirements_prompt: string }>) {
        return apiFetch<any>(`/agents/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async delete(id: number) {
        return apiFetch<void>(`/agents/${id}/`, {
            method: 'DELETE',
        });
    },
};

// Notifications API
export const notificationsAPI = {
    async list() {
        const data = await apiFetch<any>('/notifications/');
        return Array.isArray(data) ? data : (data.results || []);
    },

    async markAllRead() {
        return apiFetch<{ status: string }>('/notifications/mark-read/', {
            method: 'POST',
        });
    },

    async unreadCount() {
        return apiFetch<{ unread_count: number }>('/notifications/unread-count/');
    },
};

// RAG Smart Search API
export const ragAPI = {
    async query(queryText: string) {
        return apiFetch<{
            answer: {
                summary: string;
                items: (number | string)[];
                suggested_action: string;
            };
            meta: {
                latency_ms: number;
                sql_results: number;
                vector_results: number;
                merged_results: number;
            };
        }>('/rag/query/', {
            method: 'POST',
            body: JSON.stringify({ query: queryText }),
        });
    },
};

// Admin Dashboard API
export const adminAPI = {
    async listProducts() {
        return apiFetch<any[]>('/admin-api/products/');
    },

    async listUsers() {
        return apiFetch<any[]>('/admin-api/users/');
    },

    async deleteUser(userId: number) {
        return apiFetch<{ status: string; username: string }>(`/admin-api/users/${userId}/`, {
            method: 'DELETE',
        });
    },

    // Product edit/delete reuse existing productsAPI endpoints
    // productsAPI.update(id, data) and productsAPI.delete(id)
};

// Wallet / Payment API
export const walletAPI = {
    async topup(amount: number) {
        return apiFetch<{ status: string; new_balance: number; amount_added: number }>('/wallet/topup/', {
            method: 'POST',
            body: JSON.stringify({ amount }),
        });
    },

    async getTransactions() {
        return apiFetch<{
            id: number;
            type: string;
            type_label: string;
            amount: number;
            balance_after: number;
            description: string;
            created_at: string;
        }[]>('/wallet/transactions/');
    },
};
