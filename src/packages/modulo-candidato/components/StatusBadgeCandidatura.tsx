import React from 'react';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  RefreshCw,
  XCircle,
} from 'lucide-react';

export const StatusBadgeCandidatura: React.FC<{ estado: string }> = ({ estado }) => {
  switch (estado) {
    case 'APROVADA':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovada
        </span>
      );
    case 'EM_ANALISE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-300">
          <Clock className="w-3.5 h-3.5" /> Em Análise Técnica
        </span>
      );
    case 'PENDENTE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5" /> Pendente
        </span>
      );
    case 'DEVOLVIDA':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
          <RotateCcw className="w-3.5 h-3.5" /> Devolvida p/ Correção
        </span>
      );
    case 'CORRIGIDA':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <RefreshCw className="w-3.5 h-3.5" /> Corrigida e Reenviada
        </span>
      );
    case 'REJEITADA':
    case 'CANCELADA':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3.5 h-3.5" /> {estado === 'CANCELADA' ? 'Cancelada' : 'Rejeitada'}
        </span>
      );
    default:
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          {estado}
        </span>
      );
  }
};
