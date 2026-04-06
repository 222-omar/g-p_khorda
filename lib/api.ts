// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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

// Generic fetch wrapper with auth
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAuthToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Clear invalid tokens silently — no redirect needed
            clearAuthTokens();
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

        const response = await fetch(`${API_BASE_URL}/products/`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: data,
        });

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

// Profiles API
export const profilesAPI = {
    async getMe() {
        return apiFetch<any>('/profiles/me/');
    },

    async update(data: Partial<any>) {
        return apiFetch<any>('/profiles/me/', {
            method: 'PATCH',
            body: JSON.stringify(data),
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

        const response = await fetch(`${API_BASE_URL}/classify-image/`, {
            method: 'POST',
            headers,
            body: formData,
        });

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
