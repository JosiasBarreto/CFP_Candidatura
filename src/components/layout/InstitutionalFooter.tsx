import React from 'react';

export type ModuloNavegacao =
  | 'candidatura_publica'
  | 'catalogo_cursos'
  | 'consulta_publica'
  | 'guia_candidato';

interface InstitutionalFooterProps {
  aoNavegar: (modulo: ModuloNavegacao) => void;
}

export const InstitutionalFooter: React.FC<InstitutionalFooterProps> = ({
  aoNavegar,
}) => {
  return (
    <footer className="no-print border-t border-slate-200 bg-white py-8 text-xs text-slate-500 mt-auto">
      <div className="mx-auto w-full max-w-[1840px] px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-800">
            Centro de Formação Profissional de São Tomé e Príncipe (CFP-STP)
          </p>
          <p className="mt-0.5 text-slate-500">
            Água Grande / Budo Budo — São Tomé · Telefones: +239 980 3602 / +239 906 9235 · Email: suporte.cfpstp@gmail.com
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
          <button
            type="button"
            onClick={() => aoNavegar('candidatura_publica')}
            className="hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Formulário de Candidatura
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => aoNavegar('catalogo_cursos')}
            className="hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Catálogo de Cursos
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => aoNavegar('consulta_publica')}
            className="hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Consultar Estado &amp; Ficha PDF
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => aoNavegar('guia_candidato')}
            className="hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Guia &amp; Requisitos
          </button>
        </div>
      </div>
    </footer>
  );
};
