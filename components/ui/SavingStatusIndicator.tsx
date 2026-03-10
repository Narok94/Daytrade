import React from 'react';
import { ArrowPathIcon, CheckIcon } from '../icons';

export const SavingStatusIndicator: React.FC<{status: 'idle' | 'saving' | 'saved' | 'error'}> = ({status}) => {
    if (status === 'saving') return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-widest soft-shadow">
        <ArrowPathIcon className="w-3 h-3 animate-spin" /> Salvando...
      </div>
    );
    if (status === 'saved') return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black uppercase text-emerald-600 tracking-widest soft-shadow">
        <CheckIcon className="w-3 h-3" /> Sincronizado
      </div>
    );
    if (status === 'error') return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-[10px] font-black uppercase text-rose-600 tracking-widest soft-shadow">
        Erro ao Salvar
      </div>
    );
    return null;
};
