import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Eye,
  FileSpreadsheet,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { DadosInscricaoFormando } from '../../utils/securityAndValidation';
import {
  gerarFichaInscricaoPDF,
  exportarInscricaoParaExcel,
} from '../../utils/pdfFichaGenerator';
import { FichaPreenchidaView } from './FichaPreenchidaView';

const STORAGE_INSCRICOES_KEY = 'cfp_stp_inscricoes_submetidas_v1';

interface MinhasInscricoesViewProps {
  onNovaInscricao: () => void;
}

export const MinhasInscricoesView: React.FC<MinhasInscricoesViewProps> = ({
  onNovaInscricao,
}) => {
  const [inscricoes, setInscricoes] = useState<DadosInscricaoFormando[]>([]);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [fichaSelecionada, setFichaSelecionada] =
    useState<DadosInscricaoFormando | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_INSCRICOES_KEY);
      if (raw) {
        setInscricoes(JSON.parse(raw));
      }
    } catch {
      // Ignorar
    }
  }, []);

  if (fichaSelecionada) {
    return (
      <div className="w-full">
        <div className="w-full mb-4">
          <button
            type="button"
            onClick={() => setFichaSelecionada(null)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            &larr; Voltar à lista de inscrições realizadas
          </button>
        </div>
        <FichaPreenchidaView
          dados={fichaSelecionada}
          onEditarInscricao={() => setFichaSelecionada(null)}
          onNovaInscricao={onNovaInscricao}
        />
      </div>
    );
  }

  const filtradas = inscricoes.filter((item) => {
    const q = termoBusca.trim().toLowerCase();
    if (!q) return true;
    return (
      item.nome.toLowerCase().includes(q) ||
      item.bi.toLowerCase().includes(q) ||
      item.nif.toLowerCase().includes(q) ||
      item.protocolo.toLowerCase().includes(q) ||
      item.telefone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-emerald-800 tracking-wide">
            COMPROVATIVOS E FICHAS DE INSCRIÇÃO
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Consultar e Baixar Formulário Preenchido
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pesquise pelo seu Nº de BI, NIF, Protocolo ou Nome para visualizar e baixar novamente a sua Ficha de Inscrição em PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={onNovaInscricao}
          className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Nova Inscrição
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="mb-6 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          placeholder="Pesquisar por Nome, Nº de BI, NIF, Contacto ou Protocolo (ex: CFP-2026)..."
          className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-emerald-700"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">
            Nenhuma inscrição encontrada neste dispositivo
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Após preencher e submeter o formulário de inscrição online, o seu comprovativo ficará disponível aqui para download imediato em formato PDF.
          </p>
          <button
            type="button"
            onClick={onNovaInscricao}
            className="mt-4 min-h-[42px] px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Preencher Formulário de Inscrição
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((item) => (
            <div
              key={item.protocolo}
              className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {item.fotoPreview ? (
                  <img
                    src={item.fotoPreview}
                    alt={item.nome}
                    referrerPolicy="no-referrer"
                    className="w-14 h-18 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-18 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-[10px] text-slate-400">
                    3x4
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                    <span className="font-bold text-emerald-800">{item.protocolo}</span>
                    <span aria-hidden="true">·</span>
                    <span>BI: {item.bi}</span>
                    <span aria-hidden="true">·</span>
                    <span>NIF: {item.nif}</span>
                    <span aria-hidden="true">·</span>
                    <span>Data: {item.data_inscricao}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5 truncate">
                    {item.nome}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <strong>1ª Opção:</strong> {item.curso_nome} ({item.programa_nome})
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setFichaSelecionada(item)}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Formulário
                </button>
                <button
                  type="button"
                  onClick={() => gerarFichaInscricaoPDF(item)}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportarInscricaoParaExcel(item)}
                  className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Baixar em Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
