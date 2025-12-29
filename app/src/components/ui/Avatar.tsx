"use client";
import React from 'react';

export interface AvatarProps {
    src?: string;
    name?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | number;
    className?: string;
}

const sizeMap: Record<string, number> = { sm: 32, md: 40, lg: 48, xl: 64 };

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
    const px = typeof size === 'number' ? size : sizeMap[size] || 40;
    const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
    
    return (
        <div className={className} style={{
            width: px, height: px, borderRadius: '50%', backgroundColor: '#e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: px * 0.4, fontWeight: 600, color: '#64748b', overflow: 'hidden'
        }}>
            {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : initials}
        </div>
    );
}
