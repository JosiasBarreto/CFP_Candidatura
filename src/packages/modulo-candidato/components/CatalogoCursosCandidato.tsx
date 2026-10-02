import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CursoPublico, ProgramaPublico } from '../types';

interface CatalogoCursosCandidatoProps {
  cursos: CursoPublico[];
  programas: ProgramaPublico[];
  aoEscolherCurso: (curso: CursoPublico) => void;
}

export const CatalogoCursosCandidato: React.FC<CatalogoCursosCandidatoProps> = ({
  cursos,
  programas,
  aoEscolherCurso,
}) => {
  const [pesquisa, setPesquisa] = useState('');
  const [programaFiltro, setProgramaFiltro] = useState<number | 'todos'>('todos');
  const [horarioFiltro, setHorarioFiltro] = useState<string>('todos');

  const cursosFiltrados = useMemo(() => {
    return cursos.filter((c) => {
      // Filtro Programa
      if (programaFiltro !== 'todos') {
        const pId = Number(c.fk_programa || c.programa_id);
        if (pId !== Number(programaFiltro)) return false;
      }

      // Filtro Horário
      if (horarioFiltro !== 'todos') {
        const h = (c.horario || '').toLowerCase();
        if (horarioFiltro === 'manha' && !h.includes('08:00') && !h.includes('08h') && !h.includes('09:00')) {
          return false;
        }
        if (horarioFiltro === 'tarde' && !h.includes('13:00') && !h.includes('14:00') && !h.includes('15:00')) {
          return false;
        }
        if (horarioFiltro === 'pos_laboral' && !h.includes('17:00') && !h.includes('18:00')) {
          return false;
        }
      }

      // Filtro Pesquisa Texto
      if (pesquisa.trim()) {
        const termo = pesquisa.toLowerCase();
        const matchNome = (c.nome || '').toLowerCase().includes(termo);
        const matchDesc = (c.descricao || '').toLowerCase().includes(termo);
        const matchAcao = (c.acao || '').toLowerCase().includes(termo);
        const matchLocal = (c.local_realizacao || '').toLowerCase().includes(termo);
        if (!matchNome && !matchDesc && !matchAcao && !matchLocal) return false;
      }

      return true;
    });
  }, [cursos, programaFiltro, horarioFiltro, pesquisa]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Vista de Cursos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-2">
              Ano Formativo 2026/2027 · Inscrições Abertas
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Catálogo Oficial de Cursos CFP-STP
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Consulte os cursos técnicos disponíveis, cargas horárias, períodos e locais de realização. Clique em <strong>"Candidatar-me a este Curso"</strong> para iniciar o formulário com o curso pré-selecionado.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl shrink-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg">
              {cursos.length}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Cursos Ativos</p>
              <p className="text-[11px] text-slate-500">{programas.length} Programas Formativos</p>
            </div>
          </div>
        </div>

        {/* Filtros e Barra de Pesquisa */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-6 pt-6 border-t border-slate-200">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Pesquisar por nome do curso, área (ex: Eletricidade, Mecânica, Informática)..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-emerald-700 bg-white"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={programaFiltro}
              onChange={(e) =>
                setProgramaFiltro(
                  e.target.value === 'todos' ? 'todos' : Number(e.target.value)
                )
              }
              className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs bg-white focus:outline-none focus:border-emerald-700"
            >
              <option value="todos">Todos os Programas</option>
              {programas.map((p) => (
                <option key={p.id || p.ID} value={p.id || p.ID}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={horarioFiltro}
              onChange={(e) => setHorarioFiltro(e.target.value)}
              className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs bg-white focus:outline-none focus:border-emerald-700"
            >
              <option value="todos">Todos os Horários</option>
              <option value="manha">Regime Diurno / Manhã</option>
              <option value="tarde">Regime da Tarde</option>
              <option value="pos_laboral">Regime Pós-Laboral / Noturno</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grelha de Cursos */}
      {cursosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">Nenhum curso encontrado</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não foram encontrados cursos com os filtros selecionados. Tente ajustar os termos de pesquisa ou o programa formativo.
          </p>
          <button
            type="button"
            onClick={() => {
              setPesquisa('');
              setProgramaFiltro('todos');
              setHorarioFiltro('todos');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {cursosFiltrados.map((curso) => {
            const progNome =
              curso.programa_nome ||
              programas.find((p) => Number(p.id || p.ID) === Number(curso.fk_programa))?.nome ||
              'Formação Profissional';

            return (
              <div
                key={curso.id || curso.ID}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                      {progNome}
                    </span>
                    <span className="font-mono-tabular text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {curso.duracao} Horas
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors leading-snug">
                      {curso.nome}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {curso.descricao || 'Curso técnico profissional com componente teórico-prática ministrado em oficinas e laboratórios especializados.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        Horário: <strong>{curso.horario || '08:00'} {curso.horario_termino ? `– ${curso.horario_termino}` : ''}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        Local: <strong>{curso.local_realizacao || 'Campus CFP-STP'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        Execução: <strong>Ano Formativo {curso.ano_execucao || 2026}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Inscrições Abertas
                  </span>

                  <button
                    type="button"
                    onClick={() => aoEscolherCurso(curso)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <span>Candidatar-me</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
