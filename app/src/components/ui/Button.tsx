"use client";

import React from 'react';

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
    },
    secondary: {
        backgroundColor: '#1e293b',
        color: 'white',
        border: 'none',
    },
    outline: {
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
    },
    ghost: {
        backgroundColor: 'transparent',
        color: '#374151',
        border: 'none',
    },
    danger: {
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
    },
    success: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
    },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: {
        padding: '0.375rem 0.75rem',
        fontSize: '0.75rem',
        borderRadius: '4px',
    },
    md: {
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        borderRadius: '6px',
    },
    lg: {
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        borderRadius: '8px',
    },
    icon: {
        padding: '0.5rem',
        fontSize: '0.875rem',
        borderRadius: '6px',
        width: '36px',
        height: '36px',
    },
};

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    children,
    disabled,
    style,
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;

    const baseStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'all 0.2s',
        width: fullWidth ? '100%' : 'auto',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
    };

    return (
        <button
            disabled={isDisabled}
            style={baseStyle}
            {...props}
        >
            {loading ? (
                <LoadingSpinner size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
            ) : (
                <>
                    {icon && iconPosition === 'left' && icon}
                    {children}
                    {icon && iconPosition === 'right' && icon}
                </>
            )}
        </button>
    );
}

// ============================================================================
// ICON BUTTON
// ============================================================================

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    variant?: ButtonVariant;
    size?: 'sm' | 'md' | 'lg';
    tooltip?: string;
}

const iconButtonSizes = {
    sm: { width: '28px', height: '28px' },
    md: { width: '36px', height: '36px' },
    lg: { width: '44px', height: '44px' },
};

export function IconButton({
    icon,
    variant = 'outline',
    size = 'md',
    tooltip,
    style,
    ...props
}: IconButtonProps) {
    return (
        <button
            title={tooltip}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                cursor: props.disabled ? 'not-allowed' : 'pointer',
                opacity: props.disabled ? 0.6 : 1,
                transition: 'all 0.2s',
                ...variantStyles[variant],
                ...iconButtonSizes[size],
                padding: 0,
                ...style,
            }}
            {...props}
        >
            {icon}
        </button>
    );
}

// ============================================================================
// LOADING SPINNER
// ============================================================================

interface LoadingSpinnerProps {
    size?: number;
    color?: string;
}

export function LoadingSpinner({ size = 16, color = 'currentColor' }: LoadingSpinnerProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            style={{ animation: 'spin 1s linear infinite' }}
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                opacity={0.25}
            />
            <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
            />
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </svg>
    );
}

export default Button;
