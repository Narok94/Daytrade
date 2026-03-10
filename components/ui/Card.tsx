import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, icon }) => {
  return (
    <div className={`glass-card rounded-3xl p-6 soft-shadow ${className}`}>
      {(title || icon) && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {icon && <div className="p-2 rounded-xl bg-slate-50 text-slate-600">{icon}</div>}
            <div>
              {title && <h3 className="text-sm font-bold text-slate-900">{title}</h3>}
              {subtitle && <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{subtitle}</p>}
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
