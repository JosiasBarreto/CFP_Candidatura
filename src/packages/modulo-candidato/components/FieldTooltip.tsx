import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface FieldTooltipProps {
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'right';
  className?: string;
}

export const FieldTooltip: React.FC<FieldTooltipProps> = ({
  content,
  title,
  position = 'top',
  className = '',
}) => {
  const [visivel, setVisivel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisivel(false);
      }
    };
    if (visivel) {
      document.addEventListener('mousedown', handleClickFora);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
    };
  }, [visivel]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVisivel((v) => !v);
        }}
        onMouseEnter={() => setVisivel(true)}
        onMouseLeave={() => setVisivel(false)}
        onFocus={() => setVisivel(true)}
        onBlur={() => setVisivel(false)}
        aria-label={title || 'Informação sobre o campo'}
        className="text-slate-400 hover:text-emerald-700 focus:text-emerald-700 p-0.5 rounded transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-emerald-500/50"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {visivel && (
        <div
          role="tooltip"
          className={`absolute z-50 w-64 p-3 bg-slate-900/95 backdrop-blur-xs text-white text-[11px] rounded-xl shadow-xl border border-slate-700/80 leading-relaxed animate-in fade-in zoom-in-95 duration-150 ${
            position === 'top'
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : position === 'right'
              ? 'left-full top-1/2 -translate-y-1/2 ml-2'
              : 'top-full left-1/2 -translate-x-1/2 mt-2'
          }`}
        >
          {title && (
            <p className="font-bold text-emerald-300 text-xs mb-1 flex items-center gap-1">
              {title}
            </p>
          )}
          <p className="text-slate-200">{content}</p>
          {/* Triângulo / Seta indicadora */}
          <div
            className={`absolute w-2 h-2 bg-slate-900/95 rotate-45 border-slate-700/80 ${
              position === 'top'
                ? 'top-full -mt-1 left-1/2 -translate-x-1/2 border-r border-b'
                : position === 'right'
                ? 'right-full -mr-1 top-1/2 -translate-y-1/2 border-l border-b'
                : 'bottom-full -mb-1 left-1/2 -translate-x-1/2 border-l border-t'
            }`}
          />
        </div>
      )}
    </div>
  );
};
