"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const router = useRouter();
    
    useEffect(() => {
        router.push('/login');
    }, [router]);

    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
            <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        </main>
    );
}
