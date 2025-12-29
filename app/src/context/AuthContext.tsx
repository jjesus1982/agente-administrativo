"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

export const ROLES = {
    RESIDENT: 1,
    SYNDIC: 2,
    DOORMAN: 3,
    ADMIN: 4,
    SUPER_ADMIN: 5
};

interface User {
    id: number;
    name: string;
    email: string;
    role: number;
    role_name: string;
    tenant_id: number;
    tenant_name: string;
    photo_url: string | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasPermission: (requiredLevel: number) => boolean;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    error: null,
    login: async () => false,
    logout: () => {},
    hasPermission: () => false,
    refreshUser: async () => {},
    isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getRoleName = (role: number): string => {
        const roles: Record<number, string> = {
            1: 'Morador',
            2: 'Síndico',
            3: 'Porteiro',
            4: 'Admin',
            5: 'Super Admin'
        };
        return roles[role] || 'Morador';
    };

    const fetchUser = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const res = await api.get('/profile/me');
            if (res.ok) {
                const data = await res.json();
                setUser({
                    id: data.id,
                    name: data.name || data.full_name || 'Usuário',
                    email: data.email,
                    role: data.role || 1,
                    role_name: data.role_name || getRoleName(data.role || 1),
                    tenant_id: data.tenant_id || 1,
                    tenant_name: data.tenant_name || 'Condomínio',
                    photo_url: data.photo_url || data.avatar_url || null
                });
            } else if (res.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setUser(null);
            }
        } catch (err) {
            console.error('Erro ao buscar usuário:', err);
            setError('Erro ao carregar usuário');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const res = await api.post('/auth/login', { email, password }, { skipAuth: true });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);

                // Extrair tenant_id do token JWT
                try {
                    const tokenPayload = JSON.parse(atob(data.access_token.split('.')[1]));
                    if (tokenPayload.tenant_id) {
                        localStorage.setItem('currentTenantId', tokenPayload.tenant_id.toString());
                    }
                } catch (error) {
                    console.error('Erro ao extrair tenant_id do token:', error);
                }

                await fetchUser();
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('currentTenantId');
        setUser(null);
        window.location.href = '/login';
    };

    const hasPermission = (requiredLevel: number) => (user?.role || 0) >= requiredLevel;

    const refreshUser = async () => {
        await fetchUser();
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            error, 
            login, 
            logout, 
            hasPermission, 
            refreshUser,
            isAuthenticated: !!user 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
