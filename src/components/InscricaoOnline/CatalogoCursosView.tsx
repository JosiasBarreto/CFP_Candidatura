import React, { useState, useMemo } from 'react';
import { Search, Clock, MapPin, Calendar, Users, ArrowRight, BookOpen } from 'lucide-react';
import { CursoItem, ProgramaItem } from '../../data/cursosData';

interface CatalogoCursosViewProps {
  cursos: CursoItem[];
  programas: ProgramaItem[];
  isLoading: boolean;
  aoSelecionarCurso: (curso: CursoItem) => void;
}

export const CatalogoCursosView: React.FC<CatalogoCursosViewProps> = ({
  cursos,
  programas,
  isLoading,
  aoSelecionarCurso,
}) => {
  const safeCursos = Array.isArray(cursos) ? cursos : [];
  const safeProgramas = Array.isArray(programas) ? programas : [];

  const [programaFiltro, setProgramaFiltro] = useState<string>('todos');
  const [pesquisa, setPesquisa] = useState<string>('');

  const cursosFiltrados = useMemo(() => {
    return safeCursos.filter((c) => {
      const matchProg =
        programaFiltro === 'todos' || String(c.programa_id) === String(programaFiltro);
      const termo = pesquisa.trim().toLowerCase();
      const matchTexto =
        !termo ||
        c.nome.toLowerCase().includes(termo) ||
        c.programa_nome.toLowerCase().includes(termo) ||
        c.local_realizacao.toLowerCase().includes(termo) ||
        c.acao.toLowerCase().includes(termo);
      return matchProg && matchTexto;
    });
  }, [cursos, programaFiltro, pesquisa]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Filtros do Catálogo */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Catálogo Oficial de Programas e Cursos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Consulte a oferta formativa do Centro de Formação Profissional (CFP-STP) e inicie a sua inscrição diretamente no curso pretendido.
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar curso, polo ou horário..."
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Barra de Filtros por Programa (Botões funcionais interativos) */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setProgramaFiltro('todos')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              programaFiltro === 'todos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos os Programas ({safeCursos.length})
          </button>
          {safeProgramas.map((prog) => (
            <button
              key={prog.id}
              type="button"
              onClick={() => setProgramaFiltro(String(prog.id))}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                programaFiltro === String(prog.id)
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {prog.nome} ({prog.totalCursos})
            </button>
          ))}
        </div>
      </div>

      {/* Estado de Carregamento */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="h-3 w-1/3 rounded bg-slate-200" />
              <div className="mt-3 h-5 w-3/4 rounded bg-slate-200" />
              <div className="mt-6 h-3 w-1/2 rounded bg-slate-100" />
              <div className="mt-8 h-9 w-full rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      ) : cursosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhum curso encontrado para este filtro
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Altere o termo de pesquisa ou selecione outro programa formativo acima.
          </p>
          <button
            type="button"
            onClick={() => {
              setProgramaFiltro('todos');
              setPesquisa('');
            }}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Mostrar todos os cursos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {cursosFiltrados.map((curso) => {
            const horarioStr =
              curso.horario && curso.horario_termino
                ? `${curso.horario}–${curso.horario_termino}`
                : curso.horario || 'Horário a definir';

            return (
              <div
                key={curso.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
              >
                <div>
                  {/* Kicker textual sem cápsulas (Zero-Pill Discipline) */}
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                    <span>{curso.programa_nome}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular text-slate-500 font-normal">
                      Ação {curso.acao}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-slate-900 leading-snug">
                    {curso.nome.trim()}
                  </h3>

                  {curso.descricao && (
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                      {curso.descricao}
                    </p>
                  )}

                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Local: {curso.local_realizacao}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono-tabular">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Horário: {horarioStr}
                        {curso.duracao > 0 ? ` · Duração: ${curso.duracao}h` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono-tabular">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Período: {curso.data_inicio?.split('T')[0] || '—'} a{' '}
                        {curso.data_termino?.split('T')[0] || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono-tabular">
                      <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Vagas por turma: {curso.alunos_por_turma}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-2">
                  <button
                    type="button"
                    onClick={() => aoSelecionarCurso(curso)}
                    className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>Inscrever neste Curso (1.ª Opção)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
