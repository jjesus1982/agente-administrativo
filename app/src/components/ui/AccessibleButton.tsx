"use client";

import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  ariaLabel?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      disabled,
      ariaLabel,
      type = "button",
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      fontWeight: 500,
      borderRadius: "6px",
      border: "none",
      cursor: isDisabled ? "not-allowed" : "pointer",
      transition: "all 150ms ease",
      opacity: isDisabled ? 0.6 : 1,
      fontSize: size === "sm" ? "0.75rem" : size === "lg" ? "1rem" : "0.875rem",
      padding:
        size === "sm"
          ? "0.375rem 0.75rem"
          : size === "lg"
          ? "0.75rem 1.5rem"
          : "0.5rem 1rem",
      width: fullWidth ? "100%" : "auto",
      minHeight: size === "sm" ? "32px" : size === "lg" ? "48px" : "40px",
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: { background: "var(--accent)", color: "white" },
      secondary: {
        background: "transparent",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-default)",
      },
      success: { background: "var(--success)", color: "white" },
      danger: { background: "var(--error)", color: "white" },
      ghost: { background: "transparent", color: "var(--text-secondary)" },
    };

    const Spinner = () => (
      <svg
        width={size === "sm" ? 14 : 18}
        height={size === "sm" ? 14 : 18}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: "spin 1s linear infinite" }}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.25"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );

    const iconElement = loading ? <Spinner /> : icon;

    return (
      <>
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <button
          ref={ref}
          type={type}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          aria-busy={loading}
          aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
          style={{ ...baseStyle, ...variants[variant], ...style }}
          {...props}
        >
          {iconElement && iconPosition === "left" && iconElement}
          {children}
          {iconElement && iconPosition === "right" && iconElement}
        </button>
      </>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";

export default AccessibleButton;
