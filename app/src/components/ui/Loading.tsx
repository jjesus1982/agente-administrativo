"use client";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "dots" | "pulse";
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export function Loading({
  size = "md",
  variant = "spinner",
  text,
  fullScreen = false,
  overlay = false,
}: LoadingProps) {
  const sizes = {
    sm: { spinner: 20, dots: 8 },
    md: { spinner: 32, dots: 12 },
    lg: { spinner: 48, dots: 16 },
  };

  const spinnerSize = sizes[size].spinner;
  const dotSize = sizes[size].dots;

  const Spinner = () => (
    <svg
      width={spinnerSize}
      height={spinnerSize}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: "loading-spin 1s linear infinite" }}
      role="status"
      aria-label="Carregando"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--border-light)"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );

  const Dots = () => (
    <div
      style={{ display: "flex", gap: dotSize / 2 }}
      role="status"
      aria-label="Carregando"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            background: "var(--accent)",
            animation: `loading-bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
          }}
        />
      ))}
    </div>
  );

  const Pulse = () => (
    <div
      style={{
        width: spinnerSize,
        height: spinnerSize,
        borderRadius: "50%",
        background: "var(--accent)",
        animation: "loading-pulse 1.5s ease-in-out infinite",
      }}
      role="status"
      aria-label="Carregando"
    />
  );

  const LoadingIndicator = () => {
    switch (variant) {
      case "dots":
        return <Dots />;
      case "pulse":
        return <Pulse />;
      default:
        return <Spinner />;
    }
  };

  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
      }}
    >
      <LoadingIndicator />
      {text && (
        <p
          style={{
            fontSize: size === "sm" ? "0.75rem" : "0.875rem",
            color: "var(--text-muted)",
          }}
        >
          {text}
        </p>
      )}
    </div>
  );

  const styles = `
    @keyframes loading-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes loading-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    @keyframes loading-pulse {
      0%, 100% { transform: scale(0.8); opacity: 0.5; }
      50% { transform: scale(1); opacity: 1; }
    }
  `;

  if (fullScreen || overlay) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div
          style={{
            position: fullScreen ? "fixed" : "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: overlay ? "rgba(0, 0, 0, 0.5)" : "var(--bg-primary)",
            zIndex: fullScreen ? 9999 : 10,
          }}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      {content}
    </>
  );
}

export default Loading;
