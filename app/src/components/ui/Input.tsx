"use client";

import React, { forwardRef } from 'react';
import { Search, X, Calendar, ChevronDown } from 'lucide-react';

// ============================================================================
// INPUT COMPONENT
// ============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    onClear?: () => void;
    fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    hint,
    icon,
    iconPosition = 'left',
    onClear,
    fullWidth = true,
    style,
    className,
    ...props
}, ref) => {
    const hasIcon = !!icon;
    const showClear = onClear && props.value;

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        width: fullWidth ? '100%' : 'auto',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.75rem',
        fontWeight: 500,
        color: '#374151',
        textTransform: 'uppercase',
    };

    const inputWrapperStyle: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.625rem 0.875rem',
        paddingLeft: hasIcon && iconPosition === 'left' ? '2.5rem' : '0.875rem',
        paddingRight: showClear || (hasIcon && iconPosition === 'right') ? '2.5rem' : '0.875rem',
        borderRadius: '6px',
        border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`,
        fontSize: '0.875rem',
        color: '#374151',
        backgroundColor: props.disabled ? '#f9fafb' : 'white',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...style,
    };

    const iconStyle: React.CSSProperties = {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#9ca3af',
        pointerEvents: 'none',
        ...(iconPosition === 'left' ? { left: '0.75rem' } : { right: '0.75rem' }),
    };

    const clearButtonStyle: React.CSSProperties = {
        position: 'absolute',
        right: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        padding: '0.25rem',
        cursor: 'pointer',
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const hintStyle: React.CSSProperties = {
        fontSize: '0.75rem',
        color: error ? '#dc2626' : '#6b7280',
    };

    return (
        <div style={containerStyle} className={className}>
            {label && <label style={labelStyle}>{label}</label>}
            <div style={inputWrapperStyle}>
                {hasIcon && iconPosition === 'left' && (
                    <span style={iconStyle}>{icon}</span>
                )}
                <input ref={ref} style={inputStyle} {...props} />
                {showClear && (
                    <button type="button" style={clearButtonStyle} onClick={onClear}>
                        <X size={16} />
                    </button>
                )}
                {hasIcon && iconPosition === 'right' && !showClear && (
                    <span style={iconStyle}>{icon}</span>
                )}
            </div>
            {(error || hint) && <span style={hintStyle}>{error || hint}</span>}
        </div>
    );
});

Input.displayName = 'Input';

// ============================================================================
// SEARCH INPUT
// ============================================================================

interface SearchInputProps extends Omit<InputProps, 'icon' | 'iconPosition'> {
    onSearch?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
    onSearch,
    onKeyDown,
    ...props
}, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch();
        }
        onKeyDown?.(e);
    };

    return (
        <Input
            ref={ref}
            icon={<Search size={18} />}
            iconPosition="left"
            onKeyDown={handleKeyDown}
            {...props}
        />
    );
});

SearchInput.displayName = 'SearchInput';

// ============================================================================
// SELECT COMPONENT
// ============================================================================

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
    fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
    label,
    error,
    hint,
    options,
    placeholder,
    fullWidth = true,
    style,
    className,
    ...props
}, ref) => {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        width: fullWidth ? '100%' : 'auto',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.75rem',
        fontWeight: 500,
        color: '#374151',
        textTransform: 'uppercase',
    };

    const selectWrapperStyle: React.CSSProperties = {
        position: 'relative',
    };

    const selectStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.625rem 2.5rem 0.625rem 0.875rem',
        borderRadius: '6px',
        border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`,
        fontSize: '0.875rem',
        color: '#374151',
        backgroundColor: props.disabled ? '#f9fafb' : 'white',
        appearance: 'none',
        cursor: 'pointer',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...style,
    };

    const iconStyle: React.CSSProperties = {
        position: 'absolute',
        right: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#9ca3af',
        pointerEvents: 'none',
    };

    const hintStyle: React.CSSProperties = {
        fontSize: '0.75rem',
        color: error ? '#dc2626' : '#6b7280',
    };

    return (
        <div style={containerStyle} className={className}>
            {label && <label style={labelStyle}>{label}</label>}
            <div style={selectWrapperStyle}>
                <select ref={ref} style={selectStyle} {...props}>
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <span style={iconStyle}>
                    <ChevronDown size={18} />
                </span>
            </div>
            {(error || hint) && <span style={hintStyle}>{error || hint}</span>}
        </div>
    );
});

Select.displayName = 'Select';

// ============================================================================
// DATE INPUT
// ============================================================================

type DateInputProps = Omit<InputProps, 'type' | 'icon'>;

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>((props, ref) => {
    return (
        <Input
            ref={ref}
            type="date"
            icon={<Calendar size={18} />}
            iconPosition="right"
            {...props}
        />
    );
});

DateInput.displayName = 'DateInput';

export default Input;
