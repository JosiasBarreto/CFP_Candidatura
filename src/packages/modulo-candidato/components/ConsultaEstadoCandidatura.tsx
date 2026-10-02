import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  Search,
  Download,
  Eye,
  FileText,
  CheckCircle2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { CandidaturaPublica } from '../types';
import { candidatoApi } from '../services/candidatoApi';
import { StatusBadgeCandidatura } from './StatusBadgeCandidatura';
import { converterCandidaturaParaDadosFicha } from '../utils/candidaturaMapper';
import { FichaComprovativoView } from '../../../components/InscricaoOnline/FichaComprovativoView';

interface ConsultaEstadoCandidaturaProps {
  termoInicial?: string;
  aoNotificar: (msg: { tipo: 'sucesso' | 'erro'; texto: string } | null) => void;
}

export const ConsultaEstadoCandidatura: React.FC<ConsultaEstadoCandidaturaProps> = ({
  termoInicial = '',
  aoNotificar,
}) => {
  const [consultaTermo, setConsultaTermo] = useState(termoInicial);
  const [candidaturas, setCandidaturas] = useState<CandidaturaPublica[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [fichaVisualizar, setFichaVisualizar] = useState<CandidaturaPublica | null>(null);

  const executarPesquisa = async (termo: string) => {
    if (!termo.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'Pesquisa Vazia',
        text: 'Por favor, digite o número do BI ou o Código de Protocolo para pesquisar.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#047857',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl text-xs px-5 py-2.5 font-bold cursor-pointer',
        },
      });
      return;
    }
    setBuscando(true);
    aoNotificar(null);
    try {
      const lista = await candidatoApi.consultarPorBiOuCodigo(termo);
      setCandidaturas(lista);
      if (lista.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Nenhuma Candidatura Encontrada',
          text: `Não foi encontrada nenhuma candidatura com o termo "${termo}". Verifique se digitou corretamente o número do BI ou o código de protocolo (ex: CAND-2026-0001).`,
          confirmButtonText: 'Tentar Novamente',
          confirmButtonColor: '#047857',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-xl text-xs px-5 py-2.5 font-bold cursor-pointer',
          },
        });
      }
    } catch (e: any) {
      setCandidaturas([]);
      Swal.fire({
        icon: 'error',
        title: 'Erro na Consulta',
        text: e.message || 'Ocorreu uma falha ao consultar a candidatura no servidor.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl text-xs px-5 py-2.5 font-bold cursor-pointer',
        },
      });
    } finally {
      setBuscando(false);
    }
  };

  useEffect(() => {
    if (termoInicial) {
      setConsultaTermo(termoInicial);
      executarPesquisa(termoInicial);
    }
  }, [termoInicial]);

  if (fichaVisualizar) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setFichaVisualizar(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
          >
            &larr; Voltar aos resultados da consulta
          </button>
          <StatusBadgeCandidatura estado={fichaVisualizar.estado} />
        </div>
        <FichaComprovativoView
          dados={converterCandidaturaParaDadosFicha(fichaVisualizar)}
          aoEditarInscricao={() => setFichaVisualizar(null)}
          aoNovaInscricao={() => setFichaVisualizar(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-2">
              Portal do Candidato · Acompanhamento de Processos
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Consultar Estado da Candidatura e Baixar Ficha PDF
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Insira o seu número de Bilhete de Identidade (BI) ou o Código de Protocolo (ex: CAND-2026-0001) atribuído na submissão para acompanhar o estado do processo ou emitir a 2.ª via da sua Ficha Oficial em PDF.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            executarPesquisa(consultaTermo);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              placeholder="Digite o Nº de BI (ex: 145892STP) ou Código (ex: CAND-2026-0001)..."
              value={consultaTermo}
              onChange={(e) => setConsultaTermo(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-700"
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="px-7 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {buscando ? 'A pesquisar...' : 'Pesquisar Candidatura'}
          </button>
        </form>

        {/* Nota de Regra de Negócio: Bloqueio de Alteração para Candidatos Públicos */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Regra de Segurança:</strong> Após a submissão pública, os dados da candidatura ficam bloqueados contra edição pública (<code className="text-[11px] font-semibold">401 Unauthorized</code>). Qualquer correção ou retificação de dados é efetuada exclusivamente pela Secretaria ou Administração do CFP-STP.
          </span>
        </div>

        {candidaturas.length > 0 && (
          <div className="mt-8 space-y-5">
            <h3 className="text-sm font-bold text-slate-800">
              Candidaturas Encontradas ({candidaturas.length})
            </h3>

            {candidaturas.map((cand) => (
              <div
                key={cand.id}
                className="p-5 sm:p-6 border border-slate-200 rounded-2xl bg-slate-50/60 space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono-tabular font-bold text-emerald-900 text-base">
                        {cand.codigo}
                      </span>
                      {cand.processo_numero && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Processo Formando: {cand.processo_numero}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-900 font-bold mt-0.5">
                      {cand.nome}{' '}
                      <span className="font-normal text-xs text-slate-500">
                        · BI: {cand.bi} · NIF: {cand.nif || '—'}
                      </span>
                    </p>
                  </div>
                  <StatusBadgeCandidatura estado={cand.estado} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs border-t border-slate-200 pt-3">
                  <div>
                    <span className="text-slate-500 block">Programa:</span>
                    <strong className="text-slate-900">
                      {cand.programa?.nome || 'Formação Profissional'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">1.ª Opção de Curso:</span>
                    <strong className="text-emerald-800">
                      {cand.curso_opcao1?.nome || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">2.ª Opção de Curso:</span>
                    <strong className="text-slate-800">
                      {cand.curso_opcao2?.nome || 'Não selecionada'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Distrito / Contacto:</span>
                    <strong className="text-slate-900">
                      {cand.distrito} · {cand.contacto}
                    </strong>
                  </div>
                </div>

                {cand.estado === 'DEVOLVIDA' && (
                  <div className="p-4 bg-orange-50 border border-orange-300 rounded-xl flex items-start gap-3 text-xs text-orange-950">
                    <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm text-orange-900">
                        Candidatura Devolvida para Retificação na Secretaria:
                      </strong>
                      <p className="mt-1">{cand.motivo_devolucao}</p>
                      <p className="mt-1.5 text-[11px] text-orange-800">
                        Dirija-se ou contacte a Secretaria do CFP-STP com o código{' '}
                        <strong>{cand.codigo}</strong> para que o técnico autenticado atualize os dados da sua ficha.
                      </p>
                    </div>
                  </div>
                )}

                {cand.estado === 'APROVADA' && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      <strong>Inscrição Aprovada!</strong> Formando gerado com Processo{' '}
                      <strong>{cand.processo_numero}</strong> e Inscrição Nº{' '}
                      <strong>{cand.inscricao_id}</strong> associada a CursoInscricao.
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setFichaVisualizar(cand)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualizar Ficha (2 Páginas)
                  </button>

                  <button
                    type="button"
                    onClick={() => candidatoApi.baixarFichaOficialPdf(cand)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Descarregar Ficha Oficial (PDF)
                  </button>

                  <a
                    href={`/api/candidaturas/${cand.id}/ficha-inscricao?download=true`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    PDF Servidor
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
