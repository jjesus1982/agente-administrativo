"use client";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  animation?: "pulse" | "wave" | "none";
  style?: React.CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  borderRadius = "4px",
  variant = "rectangular",
  animation = "pulse",
  style,
}: SkeletonProps) {
  const baseStyle: React.CSSProperties = {
    display: "block",
    backgroundColor: "var(--bg-tertiary)",
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: variant === "circular" ? "50%" : borderRadius,
  };

  const animationStyle: React.CSSProperties =
    animation === "pulse"
      ? { animation: "skeleton-pulse 1.5s ease-in-out infinite" }
      : animation === "wave"
      ? { animation: "skeleton-wave 1.5s linear infinite" }
      : {};

  return (
    <>
      <style jsx global>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes skeleton-wave {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <span
        style={{ ...baseStyle, ...animationStyle, ...style }}
        role="presentation"
        aria-hidden="true"
      />
    </>
  );
}

// Skeleton for text lines
export function SkeletonText({ lines = 3, spacing = "0.5rem" }: { lines?: number; spacing?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          height="0.875rem" 
          width={i === lines - 1 ? "60%" : "100%"} 
        />
      ))}
    </div>
  );
}

// Skeleton for cards
export function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        borderRadius: "8px",
        border: "1px solid var(--border-light)",
        padding: "1.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <Skeleton variant="circular" width={40} height={40} />
        <div style={{ flex: 1 }}>
          <Skeleton height="1rem" width="60%" />
          <Skeleton height="0.75rem" width="40%" style={{ marginTop: "0.5rem" }} />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

// Skeleton for table rows
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: "0.875rem 1rem" }}>
          <Skeleton height="1rem" width={i === 0 ? "80%" : "60%"} />
        </td>
      ))}
    </tr>
  );
}

// Skeleton for stat cards
export function SkeletonStatCard() {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        borderRadius: "8px",
        border: "1px solid var(--border-light)",
        padding: "1.25rem",
        borderLeft: "3px solid var(--border-light)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <Skeleton height="0.75rem" width="50%" />
          <Skeleton height="2rem" width="40%" style={{ marginTop: "0.5rem" }} />
        </div>
        <Skeleton variant="circular" width={40} height={40} />
      </div>
    </div>
  );
}

export default Skeleton;
