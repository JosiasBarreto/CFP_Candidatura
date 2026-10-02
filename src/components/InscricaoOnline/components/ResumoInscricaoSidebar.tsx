import React from 'react';
import { Download } from 'lucide-react';
import { DadosInscricaoFormando } from '../../../utils/securityAndValidation';
import { gerarPdfFormularioInscricao } from '../../../utils/gerarPdfInscricao';

interface ResumoInscricaoSidebarProps {
  dados: DadosInscricaoFormando;
  historicoInscricoes: DadosInscricaoFormando[];
}

export const ResumoInscricaoSidebar: React.FC<ResumoInscricaoSidebarProps> = ({
  dados,
  historicoInscricoes,
}) => {
  return (
    <aside className="xl:col-span-4 2xl:col-span-3 space-y-5 xl:sticky xl:top-20">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              Ficha Individual CFP-STP
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">
              Resumo em Tempo Real
            </h3>
          </div>
          {dados.fotoPreview ? (
            <img
              src={dados.fotoPreview}
              alt="Foto tipo passe"
              referrerPolicy="no-referrer"
              className="h-12 w-10 rounded border border-slate-200 object-cover shrink-0"
            />
          ) : (
            <div className="h-12 w-10 rounded border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
              3x4
            </div>
          )}
        </div>

        <dl className="space-y-2.5 text-xs">
          <div>
            <dt className="text-slate-500">Candidato(a)</dt>
            <dd className="font-semibold text-slate-900 truncate">
              {dados.nome || 'Não preenchido'}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <dt className="text-slate-500">Nº BI / Doc.</dt>
              <dd className="font-mono-tabular font-medium text-slate-900">
                {dados.bi || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">NIF</dt>
              <dd className="font-mono-tabular font-medium text-slate-900">
                {dados.nif || '—'}
              </dd>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <dt className="text-slate-500">Distrito</dt>
              <dd className="font-medium text-slate-900 truncate">
                {dados.distrito || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Telefone</dt>
              <dd className="font-mono-tabular font-medium text-slate-900">
                {dados.telefone || '—'}
              </dd>
            </div>
          </div>
          <div>
            <dt className="text-slate-500">Habilitações Literárias</dt>
            <dd className="font-medium text-slate-900 truncate">
              {dados.habilitacao || '—'}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt className="text-[11px] font-semibold text-emerald-700">
              1.ª Opção de Curso
            </dt>
            <dd className="font-bold text-slate-900 mt-0.5">
              {dados.curso_nome || 'Nenhum curso selecionado'}
            </dd>
            {dados.programa_nome && (
              <p className="text-[11px] text-slate-600 mt-0.5">
                {dados.programa_nome}
                {dados.curso_local ? ` · ${dados.curso_local}` : ''}
              </p>
            )}
          </div>
          {dados.curso_opcao_2_nome && (
            <div>
              <dt className="text-slate-500">2.ª Opção de Curso</dt>
              <dd className="font-medium text-slate-900 truncate">
                {dados.curso_opcao_2_nome}
              </dd>
            </div>
          )}
        </dl>

        <div className="border-t border-slate-100 pt-3.5 space-y-2">
          <button
            type="button"
            onClick={() =>
              gerarPdfFormularioInscricao({
                ...dados,
                protocolo: dados.protocolo || `CFP-${dados.ano || '2026'}-FICHA`,
              })
            }
            disabled={!dados.nome.trim()}
            className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-50/70 px-4 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 text-emerald-700" />
            <span>Baixar Ficheiro de Formulário (PDF)</span>
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            Ao concluir a Etapa 6, o ficheiro PDF oficial com protocolo é baixado automaticamente.
          </p>
        </div>
      </div>

      {/* Histórico Rápido da Sessão */}
      {historicoInscricoes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-900">
            Última Inscrição Concluída
          </h4>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-tabular font-bold text-emerald-700">
                {historicoInscricoes[0].protocolo}
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-500">
                {historicoInscricoes[0].data_inscricao}
              </span>
            </div>
            <p className="font-semibold text-slate-900 truncate">
              {historicoInscricoes[0].nome}
            </p>
            <button
              type="button"
              onClick={() => gerarPdfFormularioInscricao(historicoInscricoes[0])}
              className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar PDF ({historicoInscricoes[0].protocolo})</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
