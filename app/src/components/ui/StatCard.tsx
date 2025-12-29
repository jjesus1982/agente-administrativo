import React from 'react';

interface StatCardProps {
  label: string;           // O código usa 'label', não 'title'
  value: string | number;
  icon: React.ReactNode;   // O código passa <Icon />, não a referência do componente
  color?: string;          // O código passa strings como 'var(--accent)'
  description?: string;
  onClick?: () => void;
}

export const StatCard = ({ label, value, icon, color, description, onClick }: StatCardProps) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderLeft: color ? `4px solid ${color}` : undefined }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1" style={{ color: color }}>{value}</p>
        </div>
        <div className="p-3 rounded-full bg-gray-50" style={{ color: color }}>
          {icon}
        </div>
      </div>
      {description && (
        <div className="mt-4 text-sm text-gray-500">
          {description}
        </div>
      )}
    </div>
  );
};
