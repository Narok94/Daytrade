import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <input
        className={`w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] font-bold text-rose-500 ml-1">{error}</p>}
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = '', ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <select
        className={`w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};
