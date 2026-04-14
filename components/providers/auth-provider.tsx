'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';

interface User {
    id: number;
    user: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    phone: string;
    city: string;
    trust_score: number;
    is_verified: boolean;
    is_admin: boolean;
    avatar: string | null;
    wallet_balance: string;
    total_sales: number;
    seller_rating: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.is_admin ?? false;

    const loadUser = async () => {
        try {
            const currentUser = await authAPI.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    const login = async (username: string, password: string) => {
        setLoading(true);
        try {
            await authAPI.login(username, password);
            // Fetch user profile after login
            const currentUser = await authAPI.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            setUser(null);
            throw error; // Re-throw to allow the login page to handle UI error
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        authAPI.logout();
        // Full page reload to '/' — no need to setUser(null) here.
        // Setting state before navigation causes protected pages (dashboard etc.)
        // to see user=null and race-redirect to /login before the browser lands on '/'.
        window.location.href = '/';
    };

    const refreshUser = async () => {
        await loadUser();
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
