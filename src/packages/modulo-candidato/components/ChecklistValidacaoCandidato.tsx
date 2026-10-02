import React from 'react';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Camera,
} from 'lucide-react';

export interface ChecklistItem {
  id: string;
  label: string;
  detalhe?: string;
  valido: boolean;
  obrigatorio: boolean;
  fieldId: string;
  categoria: 'identificacao' | 'contactos' | 'formacao' | 'curso' | 'confirmacao' | 'documentos';
}

interface ChecklistValidacaoCandidatoProps {
  formData: {
    nome: string;
    nome_pai: string;
    nome_mae: string;
    bi: string;
    arquivo_identificacao: string;
    nif: string;
    data_nascimento: string;
    sexo: string;
    distrito: string;
    contacto: string;
    habilitacao_literaria: string;
    situacao_emprego: string;
    programa_id: number;
    curso_opcao1_id: number;
    motivo_inscricao: string;
    autorizacao_divulgacao_dados: boolean;
  };
  fotoCarregada: boolean;
  documentosAnexados: boolean;
  aoClicarItem?: (fieldId: string) => void;
  className?: string;
}

export const ChecklistValidacaoCandidato: React.FC<ChecklistValidacaoCandidatoProps> = ({
  formData,
  fotoCarregada,
  documentosAnexados,
  aoClicarItem,
  className = '',
}) => {
  // Cálculo de idade a partir de data_nascimento
  const calcularIdadeValida = (dataNasc: string) => {
    if (!dataNasc) return false;
    const nasc = new Date(dataNasc);
    if (isNaN(nasc.getTime())) return false;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return idade >= 14; // Validação básica de idade
  };

  const itensChecklist: ChecklistItem[] = [
    {
      id: 'nome',
      label: 'Nome Completo',
      detalhe: 'Nome e apelido conforme documento',
      valido: formData.nome.trim().length >= 3 && formData.nome.trim().includes(' '),
      obrigatorio: true,
      fieldId: 'campo-nome',
      categoria: 'identificacao',
    },
    {
      id: 'bi',
      label: 'Bilhete de Identidade (BI)',
      detalhe: 'Número do documento nacional',
      valido: formData.bi.trim().length >= 3,
      obrigatorio: true,
      fieldId: 'campo-bi',
      categoria: 'identificacao',
    },
    {
      id: 'data_nascimento',
      label: 'Data de Nascimento',
      detalhe: 'Idade mínima regulamentar',
      valido: calcularIdadeValida(formData.data_nascimento),
      obrigatorio: true,
      fieldId: 'campo-data-nascimento',
      categoria: 'identificacao',
    },
    {
      id: 'sexo',
      label: 'Sexo',
      detalhe: 'Masculino ou Feminino',
      valido: Boolean(formData.sexo),
      obrigatorio: true,
      fieldId: 'campo-sexo',
      categoria: 'identificacao',
    },
    {
      id: 'distrito',
      label: 'Distrito de Residência',
      detalhe: 'Local de residência em STP',
      valido: Boolean(formData.distrito),
      obrigatorio: true,
      fieldId: 'campo-distrito',
      categoria: 'contactos',
    },
    {
      id: 'contacto',
      label: 'Telefone Principal',
      detalhe: 'Mínimo de 7 dígitos ativos',
      valido: formData.contacto.trim().replace(/\D/g, '').length >= 7,
      obrigatorio: true,
      fieldId: 'campo-contacto',
      categoria: 'contactos',
    },
    {
      id: 'habilitacao',
      label: 'Habilitações Literárias',
      detalhe: 'Nível de escolaridade concluído',
      valido: Boolean(formData.habilitacao_literaria),
      obrigatorio: true,
      fieldId: 'campo-habilitacao',
      categoria: 'formacao',
    },
    {
      id: 'situacao_emprego',
      label: 'Situação perante o Emprego',
      detalhe: 'Condição laboral atual',
      valido: Boolean(formData.situacao_emprego),
      obrigatorio: true,
      fieldId: 'campo-situacao',
      categoria: 'formacao',
    },
    {
      id: 'programa_id',
      label: 'Programa de Formação',
      detalhe: 'Programa formativo do CFP',
      valido: Number(formData.programa_id) > 0,
      obrigatorio: true,
      fieldId: 'campo-programa',
      categoria: 'curso',
    },
    {
      id: 'curso_opcao1_id',
      label: 'Curso (1.ª Opção Prioritária)',
      detalhe: 'Curso técnico pretendido',
      valido: Number(formData.curso_opcao1_id) > 0,
      obrigatorio: true,
      fieldId: 'campo-curso-opcao1',
      categoria: 'curso',
    },
    {
      id: 'motivo_inscricao',
      label: 'Motivo da Inscrição',
      detalhe: 'Mínimo 10 caracteres',
      valido: formData.motivo_inscricao.trim().length >= 10,
      obrigatorio: true,
      fieldId: 'campo-motivo',
      categoria: 'curso',
    },
    {
      id: 'autorizacao',
      label: 'Declaração de Veracidade',
      detalhe: 'Compromisso de honra assinalado',
      valido: Boolean(formData.autorizacao_divulgacao_dados),
      obrigatorio: true,
      fieldId: 'campo-declaracao',
      categoria: 'confirmacao',
    },
  ];

  const itensObrigatorios = itensChecklist.filter((item) => item.obrigatorio);
  const itensValidos = itensObrigatorios.filter((item) => item.valido);
  const totalObrigatorios = itensObrigatorios.length;
  const totalValidos = itensValidos.length;
  const percentagem = Math.round((totalValidos / totalObrigatorios) * 100);
  const completo = totalValidos === totalObrigatorios;

  const handleScrollToField = (fieldId: string) => {
    if (aoClicarItem) {
      aoClicarItem(fieldId);
      return;
    }
    const elem = document.getElementById(fieldId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      elem.focus();
      // Efeito visual de destaque temporário
      elem.classList.add('ring-2', 'ring-emerald-500');
      setTimeout(() => {
        elem.classList.remove('ring-2', 'ring-emerald-500');
      }, 1500);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 ${className}`}
    >
      {/* Cabeçalho do Painel com Progresso */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              completo
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {completo ? <CheckCircle2 className="w-4 h-4" /> : <FileCheck2 className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              Validação em Tempo Real
            </h4>
            <p className="text-[11px] text-slate-500">
              {totalValidos} de {totalObrigatorios} requisitos obrigatórios
            </p>
          </div>
        </div>

        <span
          className={`font-mono-tabular text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${
            completo
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : percentagem >= 50
              ? 'bg-teal-50 text-teal-800 border-teal-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {percentagem}%
        </span>
      </div>

      {/* Barra de Progresso Animada */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            completo
              ? 'bg-emerald-600'
              : percentagem >= 60
              ? 'bg-teal-600'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${percentagem}%` }}
        />
      </div>

      {/* Lista de Itens do Checklist */}
      <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
        {itensChecklist.map((item) => {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleScrollToField(item.fieldId)}
              className={`w-full text-left p-2.5 rounded-xl text-xs flex items-start gap-2.5 border transition-all cursor-pointer group ${
                item.valido
                  ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950 hover:bg-emerald-100/70'
                  : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title={`Clique para ir ao campo: ${item.label}`}
            >
              <div className="shrink-0 mt-0.5">
                {item.valido ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`font-semibold truncate ${
                      item.valido ? 'text-emerald-950' : 'text-slate-800'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.valido ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                      OK
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 shrink-0">
                      Pendente &rarr;
                    </span>
                  )}
                </div>
                {item.detalhe && (
                  <p
                    className={`text-[10px] truncate mt-0.5 ${
                      item.valido ? 'text-emerald-800/80' : 'text-slate-500'
                    }`}
                  >
                    {item.detalhe}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Itens Recomendados / Opcionais (Foto e Anexos) */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
          Elementos Recomendados
        </span>

        <button
          type="button"
          onClick={() => handleScrollToField('campo-foto')}
          className={`w-full text-left p-2 rounded-xl text-[11px] flex items-center justify-between border transition-all cursor-pointer ${
            fotoCarregada
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
              : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Camera className={`w-3.5 h-3.5 ${fotoCarregada ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Fotografia Tipo Passe</span>
          </div>
          <span className={`text-[10px] font-semibold ${fotoCarregada ? 'text-emerald-700' : 'text-slate-400'}`}>
            {fotoCarregada ? 'Anexada' : 'Opcional'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleScrollToField('campo-bi-doc')}
          className={`w-full text-left p-2 rounded-xl text-[11px] flex items-center justify-between border transition-all cursor-pointer ${
            documentosAnexados
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
              : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileCheck2 className={`w-3.5 h-3.5 ${documentosAnexados ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Documentos em Anexo</span>
          </div>
          <span className={`text-[10px] font-semibold ${documentosAnexados ? 'text-emerald-700' : 'text-slate-400'}`}>
            {documentosAnexados ? 'Anexados' : 'Opcional'}
          </span>
        </button>
      </div>

      {/* Alerta de Estado Final */}
      <div
        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-colors ${
          completo
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {completo ? (
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        )}
        <div className="leading-tight">
          <p className="font-bold">
            {completo
              ? 'Formulário 100% Validado!'
              : `${totalObrigatorios - totalValidos} campo(s) obrigatório(s) pendente(s)`}
          </p>
          <p className="text-[11px] mt-0.5 opacity-90">
            {completo
              ? 'Pode submeter com segurança e baixar a sua Ficha Oficial em PDF (2 páginas).'
              : 'Clique nos itens pendentes acima para preenchê-los diretamente no formulário.'}
          </p>
        </div>
      </div>
    </div>
  );
};
