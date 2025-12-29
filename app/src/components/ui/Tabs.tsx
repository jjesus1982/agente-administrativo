"use client";

import React, { useState } from 'react';

export interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

export interface TabsProps {
    tabs: Tab[];
    activeTab?: string;
    onChange?: (tabId: string) => void;
    className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    const [active, setActive] = useState(activeTab || tabs[0]?.id);

    const handleClick = (tabId: string) => {
        setActive(tabId);
        onChange?.(tabId);
    };

    return (
        <div 
            className={className}
            style={{
                display: 'flex',
                gap: '0.25rem',
                borderBottom: '1px solid #e5e7eb',
                marginBottom: '1rem',
            }}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleClick(tab.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: active === tab.id ? '#3b82f6' : '#64748b',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: active === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        marginBottom: '-1px',
                    }}
                >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && (
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            backgroundColor: active === tab.id ? '#dbeafe' : '#f1f5f9',
                            color: active === tab.id ? '#3b82f6' : '#64748b',
                        }}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
