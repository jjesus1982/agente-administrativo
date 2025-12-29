import React from 'react';
import { FileQuestion } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const sizeStyles = {
  sm: { padding: '1rem', iconSize: 32, titleSize: '0.875rem', descSize: '0.75rem' },
  md: { padding: '2rem', iconSize: 48, titleSize: '1rem', descSize: '0.875rem' },
  lg: { padding: '3rem', iconSize: 64, titleSize: '1.125rem', descSize: '1rem' },
};

export const EmptyState = ({ title, description, action, icon, size = 'md', style }: EmptyStateProps) => {
  const s = sizeStyles[size];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: s.padding, textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: '8px',
      backgroundColor: 'rgba(249, 250, 251, 0.5)', ...style
    }}>
      <div style={{ display: 'flex', height: s.iconSize, width: s.iconSize, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: '#f3f4f6', marginBottom: '1rem' }}>
        {icon || <FileQuestion style={{ height: s.iconSize * 0.5, width: s.iconSize * 0.5, color: '#9ca3af' }} />}
      </div>
      <h3 style={{ fontSize: s.titleSize, fontWeight: 500, color: '#111827' }}>{title}</h3>
      <p style={{ marginTop: '0.25rem', fontSize: s.descSize, color: '#6b7280', maxWidth: '20rem', marginBottom: '1.5rem' }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
