import React from 'react';
import { Menu, X } from 'lucide-react';
import { ModuloPortal } from '../../types/inscricao';

interface HeaderNavbarProps {
  moduloAtivo: ModuloPortal;
  menuMobileAberto: boolean;
  aoAlternarMenuMobile: () => void;
  aoNavegar: (modulo: ModuloPortal) => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  moduloAtivo,
  menuMobileAberto,
  aoAlternarMenuMobile,
  aoNavegar,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex w-full max-w-[1840px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-10">
        {/* Marca Institucional */}
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            aoNavegar('formulario');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 no-underline hover:text-emerald-800 transition-colors whitespace-nowrap"
        >
          CFP-STP · Portal de Inscrições
        </a>

        {/* Navegação Principal */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => aoNavegar('formulario')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              moduloAtivo === 'formulario'
                ? 'border-emerald-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Nova Inscrição
          </button>
          <button
            type="button"
            onClick={() => aoNavegar('catalogo')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              moduloAtivo === 'catalogo'
                ? 'border-emerald-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Cursos Disponíveis
          </button>
          <button
            type="button"
            onClick={() => aoNavegar('consultar')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              moduloAtivo === 'consultar'
                ? 'border-emerald-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Baixar Ficha PDF
          </button>
        </nav>

        {/* Ação Rápida + Botão Mobile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              aoNavegar(moduloAtivo === 'consultar' ? 'formulario' : 'consultar')
            }
            className="hidden sm:inline-flex min-h-[38px] items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            {moduloAtivo === 'consultar'
              ? 'Preencher Inscrição'
              : 'Consultar Comprovativo'}
          </button>

          <button
            type="button"
            onClick={aoAlternarMenuMobile}
            className="inline-flex md:hidden items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Abrir menu de navegação"
            aria-expanded={menuMobileAberto}
          >
            {menuMobileAberto ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {menuMobileAberto && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => aoNavegar('formulario')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              moduloAtivo === 'formulario'
                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Nova Inscrição Online
          </button>
          <button
            type="button"
            onClick={() => aoNavegar('catalogo')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              moduloAtivo === 'catalogo'
                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Cursos Disponíveis
          </button>
          <button
            type="button"
            onClick={() => aoNavegar('consultar')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              moduloAtivo === 'consultar'
                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Baixar Ficha de Inscrição (PDF)
          </button>
        </div>
      )}
    </header>
  );
};
