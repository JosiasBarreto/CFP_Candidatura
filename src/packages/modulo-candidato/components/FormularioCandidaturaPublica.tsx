import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  User,
  MapPin,
  GraduationCap,
  BookOpen,
  Upload,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Camera,
  FileText,
  ShieldCheck,
  FileSpreadsheet, X, Image as ImageIcon,
} from 'lucide-react';
import { ProgramaPublico, CursoPublico, CandidaturaPublica } from '../types';
import { candidatoApi } from '../services/candidatoApi';
import { converterCandidaturaParaDadosFicha } from '../utils/candidaturaMapper';
import { exportarInscricaoParaExcel } from '../../../utils/pdfFichaGenerator';
import { calcularIdade } from '../../../utils/securityAndValidation';
import { FichaComprovativoView } from '../../../components/InscricaoOnline/FichaComprovativoView';
import { CameraCaptureModal } from '../../../components/InscricaoOnline/CameraCaptureModal';
import { FieldTooltip } from './FieldTooltip';
import {
  DISTRITOS_PERMITIDOS,
  ARQUIVOS_IDENTIFICACAO,
} from '../../../data/cursosData';

interface FormularioCandidaturaPublicaProps {
  programas: ProgramaPublico[];
  cursos: CursoPublico[];
  cursoPreSelecionado?: CursoPublico | null;
  aoNotificar: (msg: { tipo: 'sucesso' | 'erro'; texto: string } | null) => void;
  aoIrParaConsulta: (codigoOuBi: string) => void;
}

const OPCOES_HABILITACAO_LITERARIA = [
  '1.ª Classe',
  '2.ª Classe',
  '3.ª Classe',
  '4.ª Classe',
  '5.ª Classe',
  '6.ª Classe',
  '7.ª Classe',
  '8.ª Classe',
  '9.ª Classe',
  '10.ª Classe',
  '11.ª Classe',
  '12.ª Classe',
  'Bacharelato',
  'Licenciatura',
  'Pós-Graduação',
  'Mestrado',
  'Doutoramento',
  'Outra',
];

export const FormularioCandidaturaPublica: React.FC<FormularioCandidaturaPublicaProps> = ({
  programas,
  cursos,
  cursoPreSelecionado,
  aoNotificar,
  aoIrParaConsulta,
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    nome_pai: '',
    nome_mae: '',
    bi: '',
    arquivo_identificacao: ARQUIVOS_IDENTIFICACAO[0] as string,
    nif: '',
    data_nascimento: '',
    sexo: '',
    nacionalidade: 'Santomense',
    naturalidade: '',
    estado_civil: '',
    agregado: '',
    morada: '',
    distrito: '',
    zona: '',
    contacto: '',
    contacto_alternativo: '',
    email: '',
    habilitacao_literaria: '',
    habilitacao_area: '',
    formacao_profissional: '',
    experiencia_profissional: '',
    ocupacao: '',
    motivo_inscricao: '',
    programa_id: 0,
    curso_opcao1_id: 0,
    curso_opcao2_id: 0,
    ano: 2026,
    situacao_emprego: '',
    atividade_profissional_anterior: '',
    funcao_exerce: '',
    funcao_desde: '',
    profissao: '',
    deficiente: false,
    tipo_deficiencia: '',
    encaminhado_apoio_social: false,
    instituicao_apoio_social: '',
    autorizacao_divulgacao_dados: false,
  });

  const [fileFoto, setFileFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>('');
  const [cameraAberta, setCameraAberta] = useState<boolean>(false);
  const [fileBi, setFileBi] = useState<File | null>(null);
  const [fileNif, setFileNif] = useState<File | null>(null);
  const [fileCertificado, setFileCertificado] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Estados de Validação ao Submeter
  const [tentouSubmeter, setTentouSubmeter] = useState<boolean>(false);
  const [errosCampos, setErrosCampos] = useState<Record<string, boolean>>({});

  const [candidaturaRecemCriada, setCandidaturaRecemCriada] =
    useState<CandidaturaPublica | null>(null);
  const [mostrarFicha2Paginas, setMostrarFicha2Paginas] = useState<boolean>(false);

  // Sincroniza quando vem um curso pré-selecionado do catálogo
  useEffect(() => {
    if (cursoPreSelecionado) {
      const progId = Number(cursoPreSelecionado.fk_programa || cursoPreSelecionado.programa_id || 1);
      const cursoId = Number(cursoPreSelecionado.id || cursoPreSelecionado.ID);

      setFormData((prev) => ({
        ...prev,
        programa_id: progId,
        curso_opcao1_id: cursoId,
        curso_opcao2_id: 0, // Opção 2 não é autopreenchida por padrão
      }));
    }
  }, [cursoPreSelecionado]);

  // Ao alterar o programa, ajusta curso_opcao1_id para o primeiro curso do programa e ZERA a opcao2!
  const handleProgramaChange = (novoProgramaId: number) => {
    const cursosDoPrograma = cursos.filter(
      (c) => Number(c.fk_programa || c.programa_id) === Number(novoProgramaId)
    );
    const primeiroCurso = cursosDoPrograma[0];
    setFormData((prev) => ({
      ...prev,
      programa_id: novoProgramaId,
      curso_opcao1_id: primeiroCurso ? Number(primeiroCurso.id || primeiroCurso.ID) : 0,
      curso_opcao2_id: 0, // Não autopreenche opção 2 (já que não é obrigatória)
    }));
  };

  const handleFotoUpload = (file: File | null) => {
    setFileFoto(file);
    if (!file) {
      setFotoPreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const fieldHasError = (fieldName: string) => Boolean(tentouSubmeter && errosCampos[fieldName]);

  const getInputStyle = (fieldName: string, isEmerald = false) => {
    if (fieldHasError(fieldName)) {
      return 'mt-1 w-full border-2 border-rose-500 bg-rose-50/90 text-rose-950 placeholder-rose-400 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all shadow-xs';
    }
    if (isEmerald) {
      return 'mt-1 w-full border border-emerald-300 rounded-lg p-2.5 text-xs font-semibold bg-emerald-50/40 text-slate-900 focus:outline-none focus:border-emerald-700 transition-all';
    }
    return 'mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:border-emerald-700 transition-all';
  };

  const handleSubmissaoPublica = async (e: React.FormEvent) => {
    e.preventDefault();
    aoNotificar(null);
    setTentouSubmeter(true);

    // Validação dos campos obrigatórios ao submeter
    const novosErros: Record<string, boolean> = {};
    if (!formData.nome.trim()) novosErros.nome = true;
    if (!formData.bi.trim()) novosErros.bi = true;
    if (!formData.data_nascimento) novosErros.data_nascimento = true;
    if (!formData.sexo) novosErros.sexo = true;
    if (!formData.distrito) novosErros.distrito = true;
    if (!formData.contacto.trim()) novosErros.contacto = true;
    if (!formData.habilitacao_literaria) novosErros.habilitacao_literaria = true;
    if (!formData.situacao_emprego) novosErros.situacao_emprego = true;
    if (!formData.programa_id) novosErros.programa_id = true;
    if (!formData.curso_opcao1_id) novosErros.curso_opcao1_id = true;
    if (!formData.motivo_inscricao.trim()) novosErros.motivo_inscricao = true;
    if (!formData.autorizacao_divulgacao_dados) novosErros.autorizacao_divulgacao_dados = true;

    // Fotografia é ESTRITAMENTE OBRIGATÓRIA
    if (!fotoPreview && !fileFoto) {
      novosErros.foto = true;
    }

    setErrosCampos(novosErros);

    if (Object.keys(novosErros).length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos Obrigatórios em Falta!',
        text: 'Por favor, preencha todos os campos obrigatórios e carregue a Fotografia Tipo Passe para prosseguir com a candidatura.',
        confirmButtonText: 'Corrigir Campos Assinalados',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl text-xs px-5 py-2.5 font-bold cursor-pointer',
        },
      });

      const primeiroCampo = Object.keys(novosErros)[0];
      const el = document.getElementById(`campo-${primeiroCampo}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    setSubmitting(true);

    const payload = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      payload.append(k, String(v));
    });

    // Mapeamento específico de variáveis solicitadas
    payload.append('arquivo_identificacao', formData.arquivo_identificacao || '');
    payload.append('Arquivo de Identificação', formData.arquivo_identificacao || '');
    payload.append('area_formacao', formData.habilitacao_area || '');
    payload.append('Área de Formação', formData.habilitacao_area || '');

    const idadeCalculada = calcularIdade(formData.data_nascimento);
    if (idadeCalculada !== null && idadeCalculada >= 0) {
      payload.append('idade', String(idadeCalculada));
    }

    if (fotoPreview) {
      payload.append('fotoPreview', fotoPreview);
    }
    if (fileFoto) payload.append('foto', fileFoto);
    if (fileBi) payload.append('bi', fileBi);
    if (fileNif) payload.append('nif_doc', fileNif);
    if (fileCertificado) payload.append('habilitacao', fileCertificado);

    try {
      const json = await candidatoApi.submeterCandidaturaPublica(payload);
      const cand: CandidaturaPublica = {
        ...json.candidatura,
        data_nascimento: formData.data_nascimento || json.candidatura?.data_nascimento,
        idade: json.candidatura?.idade || (idadeCalculada !== null ? idadeCalculada : undefined),
        foto_data_url: fotoPreview || json.candidatura?.foto_data_url,
      };
      setCandidaturaRecemCriada(cand);

      // Inicia imediatamente o download da Ficha Oficial CFP-STP (2 páginas em PDF)
      candidatoApi.baixarFichaOficialPdf(cand);

      Swal.fire({
        icon: 'success',
        title: 'Candidatura Submetida com Sucesso!',
        html: `
          <div style="text-align: left; font-size: 13px; color: #334155; margin-top: 8px;">
            <p>A sua candidatura foi registada com sucesso no sistema do CFP-STP com o código de protocolo:</p>
            <div style="padding: 12px; background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; font-weight: bold; color: #064e3b; font-size: 16px; text-align: center; margin: 12px 0;">
              ${cand.codigo}
            </div>
            <p style="font-size: 11px; color: #64748b; text-align: center;">
              O download automático da sua Ficha Oficial de Inscrição em PDF (2 páginas A4) foi iniciado.
            </p>
          </div>
        `,
        confirmButtonText: 'Acompanhar Estado da Candidatura',
        confirmButtonColor: '#047857',
        showCancelButton: true,
        cancelButtonText: 'Fechar',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl text-xs px-5 py-2.5 font-bold cursor-pointer',
          cancelButton: 'rounded-xl text-xs px-5 py-2.5 font-bold cursor-pointer',
        },
      }).then((result) => {
        if (result.isConfirmed) {
          aoIrParaConsulta(cand.codigo);
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Erro ao Submeter Candidatura',
        text: err.message || 'Ocorreu um erro ao comunicar com o servidor da candidatura.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl text-xs px-5 py-2.5 font-bold cursor-pointer',
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (candidaturaRecemCriada && mostrarFicha2Paginas) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl p-4 shadow-xs">
          <button
            type="button"
            onClick={() => setMostrarFicha2Paginas(false)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
          >
            &larr; Voltar ao resumo da candidatura {candidaturaRecemCriada.codigo}
          </button>
          <button
            type="button"
            onClick={() => aoIrParaConsulta(candidaturaRecemCriada.codigo)}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
          >
            Acompanhar Estado da Candidatura
          </button>
        </div>
        <FichaComprovativoView
          dados={converterCandidaturaParaDadosFicha(candidaturaRecemCriada)}
          aoEditarInscricao={() => setMostrarFicha2Paginas(false)}
          aoNovaInscricao={() => {
            setCandidaturaRecemCriada(null);
            setMostrarFicha2Paginas(false);
          }}
        />
      </div>
    );
  }

  const safeProgramas = Array.isArray(programas) ? programas : [];
  const safeCursos = Array.isArray(cursos) ? cursos : [];

  const cursosFiltrados = safeCursos.filter(
    (c) => Number(c.fk_programa || c.programa_id) === Number(formData.programa_id)
  );
  const listaCursosExibida = cursosFiltrados.length > 0 ? cursosFiltrados : safeCursos;

  // Opções de Estado Civil ajustadas ao Sexo selecionado
  const opcoesEstadoCivil =
    formData.sexo === 'Masculino'
      ? ['Solteiro', 'Casado', 'Divorciado', 'Viúvo']
      : formData.sexo === 'Feminino'
      ? ['Solteira', 'Casada', 'Divorciada', 'Viúva']
      : ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'];

  return (
    <div className="space-y-6">
      {/* Banner Institucional Verde CFP-STP */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 rounded-2xl text-white p-6 md:p-8 shadow-md border border-emerald-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-3xl">
            <span className="bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
              Centro de Formação Profissional · Candidaturas Oficiais 2026/2027
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Formulário Oficial de Candidatura ao CFP-STP
            </h2>
            <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
              Preencha com atenção os seus dados pessoais, selecione as suas opções de formação e carregue a sua fotografia tipo passe.{' '}
              <strong className="text-white">
                Ao submeter, receberá imediatamente a Ficha de Inscrição Oficial em PDF (2 páginas A4)
              </strong>{' '}
              com o seu código oficial de candidatura.
            </p>
          </div>

          <div className="bg-emerald-900/60 border border-emerald-700/60 rounded-xl p-4 text-xs space-y-2 shrink-0 lg:w-72">
            <p className="font-bold text-emerald-200 uppercase tracking-wider">
              Etapas da Inscrição
            </p>
            <div className="flex items-center gap-2 text-emerald-100">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px]">
                1
              </span>
              <span>Identificação e Contactos</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-100">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px]">
                2
              </span>
              <span>Cursos e Fotografia Passe</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-100">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px]">
                3
              </span>
              <span>Emissão da Ficha PDF Oficial</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cartão de Sucesso Imediato após Submissão */}
      {candidaturaRecemCriada && (
        <div className="bg-emerald-50 border-2 border-emerald-600 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-emerald-950">
                  Candidatura Registada com Sucesso!
                </h3>
                <p className="text-sm text-emerald-900 mt-0.5">
                  Código Oficial:{' '}
                  <strong className="font-mono-tabular bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {candidaturaRecemCriada.codigo}
                  </strong>{' '}
                  · Estado atual: <strong>{candidaturaRecemCriada.estado}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => aoIrParaConsulta(candidaturaRecemCriada.codigo)}
              className="px-4 py-2 rounded-xl border border-emerald-700 text-emerald-900 hover:bg-emerald-100 text-xs font-bold cursor-pointer self-start sm:self-auto"
            >
              Consultar Estado ({candidaturaRecemCriada.codigo}) &rarr;
            </button>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                Candidato(a) Inscrito(a)
              </span>
              <p className="font-bold text-slate-900 text-base">
                {candidaturaRecemCriada.nome}
              </p>
              <span className="text-xs text-slate-600">
                1.ª Opção:{' '}
                <strong>
                  {candidaturaRecemCriada.curso_opcao1?.nome || 'Curso Selecionado'}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                type="button"
                onClick={() => candidatoApi.baixarFichaOficialPdf(candidaturaRecemCriada)}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Baixar Ficha Oficial CFP-STP (PDF 2 Páginas)
              </button>

              <button
                type="button"
                onClick={() =>
                  exportarInscricaoParaExcel(
                    converterCandidaturaParaDadosFicha(candidaturaRecemCriada)
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 border border-emerald-600 bg-emerald-100/70 hover:bg-emerald-200 text-emerald-950 rounded-xl font-semibold text-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                Exportar Excel (.xlsx)
              </button>

              <button
                type="button"
                onClick={() => setMostrarFicha2Paginas(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-semibold text-xs transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Ver Ficha 2 Páginas no Ecrã
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulário Principal */}
      <div className="w-full">
        <form
          onSubmit={handleSubmissaoPublica}
          className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 md:p-8 space-y-8"
        >
          {/* 1. Identificação do Candidato */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <User className="w-5 h-5 text-emerald-700" />
              1. Identificação do Candidato (Página 1 da Ficha Oficial)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              <div className="md:col-span-2">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Nome Completo *</span>
                  <FieldTooltip
                    title="Nome Completo"
                    content="Escreva o seu nome completo rigorosamente igual ao registado no seu Bilhete de Identidade ou Passaporte."
                  />
                </label>
                <input
                  id="campo-nome"
                  type="text"
                  required
                  placeholder="Nome completo conforme o Bilhete de Identidade"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={getInputStyle('nome')}
                />
                {fieldHasError('nome') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Nome completo é obrigatório.
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Filiação — Nome do Pai</span>
                  <FieldTooltip
                    title="Filiação Paterna"
                    content="Nome do pai conforme a sua certidão de nascimento ou bilhete de identidade."
                  />
                </label>
                <input
                  type="text"
                  placeholder="Nome completo do pai"
                  value={formData.nome_pai}
                  onChange={(e) => setFormData({ ...formData, nome_pai: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Filiação — Nome da Mãe</span>
                  <FieldTooltip
                    title="Filiação Materna"
                    content="Nome da mãe conforme a sua certidão de nascimento ou bilhete de identidade."
                  />
                </label>
                <input
                  type="text"
                  placeholder="Nome completo da mãe"
                  value={formData.nome_mae}
                  onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Bilhete de Identidade (BI) *</span>
                  <FieldTooltip
                    title="Número do Documento (BI)"
                    content="Número do Bilhete de Identidade, Passaporte ou Cédula Pessoal."
                  />
                </label>
                <input
                  id="campo-bi"
                  type="text"
                  required
                  placeholder="Ex: 145892STP"
                  value={formData.bi}
                  onChange={(e) => setFormData({ ...formData, bi: e.target.value })}
                  className={getInputStyle('bi')}
                />
                {fieldHasError('bi') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Número de BI é obrigatório.
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Arquivo de Identificação</span>
                  <FieldTooltip
                    title="Arquivo de Identificação"
                    content="Repartição ou Conservatória do Registo Civil onde o seu documento foi emitido."
                  />
                </label>
                <select
                  value={formData.arquivo_identificacao}
                  onChange={(e) =>
                    setFormData({ ...formData, arquivo_identificacao: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-emerald-700"
                >
                  {ARQUIVOS_IDENTIFICACAO.map((arq) => (
                    <option key={arq} value={arq}>
                      {arq}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>NIF (Contribuinte - Opcional)</span>
                  <FieldTooltip
                    title="NIF — Número de Identificação Fiscal"
                    content="Número fiscal de 9 dígitos. Pode ser enviado em branco caso não possua."
                  />
                </label>
                <input
                  type="text"
                  placeholder="Ex: 210495821 (Opcional)"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Data de Nascimento *</span>
                  <FieldTooltip
                    title="Idade Mínima"
                    content="A idade mínima regulamentar para admissão aos cursos é de 16 anos completos."
                  />
                </label>
                <input
                  id="campo-data_nascimento"
                  type="date"
                  required
                  value={formData.data_nascimento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_nascimento: e.target.value })
                  }
                  className={getInputStyle('data_nascimento')}
                />
                {fieldHasError('data_nascimento') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Data de nascimento é obrigatória.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Sexo *</label>
                <select
                  id="campo-sexo"
                  required
                  value={formData.sexo}
                  onChange={(e) => setFormData({ ...formData, sexo: e.target.value, estado_civil: '' })}
                  className={getInputStyle('sexo')}
                >
                  <option value="">Selecione o sexo...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
                {fieldHasError('sexo') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Seleção do sexo é obrigatória.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Estado Civil
                </label>
                <select
                  value={formData.estado_civil}
                  onChange={(e) =>
                    setFormData({ ...formData, estado_civil: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-emerald-700"
                >
                  <option value="">Selecione o estado civil...</option>
                  {opcoesEstadoCivil.map((ec) => (
                    <option key={ec} value={ec}>
                      {ec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nacionalidade
                </label>
                <input
                  type="text"
                  value={formData.nacionalidade}
                  onChange={(e) =>
                    setFormData({ ...formData, nacionalidade: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Naturalidade / Agregado</span>
                  <FieldTooltip
                    title="Naturalidade e Agregado"
                    content="Local de nascimento e número de pessoas que coabitam no mesmo domicílio."
                  />
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Naturalidade"
                    value={formData.naturalidade}
                    onChange={(e) =>
                      setFormData({ ...formData, naturalidade: e.target.value })
                    }
                    className="col-span-2 border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                  />
                  <input
                    type="number"
                    min={1}
                    max={25}
                    title="Nº de pessoas no agregado familiar"
                    value={formData.agregado}
                    onChange={(e) =>
                      setFormData({ ...formData, agregado: e.target.value })
                    }
                    className="border border-slate-300 rounded-lg p-2.5 text-xs text-center focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Contacto e Morada */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <MapPin className="w-5 h-5 text-emerald-700" />
              2. Contacto, Morada e Distrito
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Distrito de Residência *</span>
                  <FieldTooltip
                    title="Distrito"
                    content="Distrito de residência habitual para fins de alocação de centro formativo."
                  />
                </label>
                <select
                  id="campo-distrito"
                  required
                  value={formData.distrito}
                  onChange={(e) => setFormData({ ...formData, distrito: e.target.value })}
                  className={getInputStyle('distrito')}
                >
                  <option value="">Selecione o distrito...</option>
                  {DISTRITOS_PERMITIDOS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {fieldHasError('distrito') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Distrito é obrigatório.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Morada / Localidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Budo Budo, Riboque, Madre Deus, Trindade..."
                  value={formData.morada}
                  onChange={(e) =>
                    setFormData({ ...formData, morada: e.target.value, zona: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Telefone Principal *</span>
                  <FieldTooltip
                    title="Contacto Obrigatório"
                    content="Número de telemóvel ativo (ex: 9803602 ou 9069235) para contacto urgente."
                  />
                </label>
                <input
                  id="campo-contacto"
                  type="text"
                  required
                  placeholder="Ex: 9803602 ou 9069235"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  className={getInputStyle('contacto')}
                />
                {fieldHasError('contacto') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Telefone principal é obrigatório.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Telefone Alternativo
                </label>
                <input
                  type="text"
                  placeholder="Ex: 9803602"
                  value={formData.contacto_alternativo}
                  onChange={(e) =>
                    setFormData({ ...formData, contacto_alternativo: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Correio Eletrónico (Email)
                </label>
                <input
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* 3. Habilitações Literárias, Formação e Situação perante o Emprego */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <GraduationCap className="w-5 h-5 text-emerald-700" />
              3. Habilitações Literárias, Experiência e Situação perante o Emprego
            </h3>

            <div className="space-y-5 mt-4">
              {/* Habilitações Literárias (1.ª à 12.ª Classe, Licenciatura, Bacharelato, Mestrado, Pós-Graduação) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <span>Habilitação Literária Concluída *</span>
                    <FieldTooltip
                      title="Habilitações Literárias"
                      content="Selecione de 1.ª à 12.ª Classe, Bacharelato, Licenciatura, Pós-Graduação, Mestrado ou Doutoramento."
                    />
                  </label>
                  <select
                    id="campo-habilitacao_literaria"
                    required
                    value={formData.habilitacao_literaria}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        habilitacao_literaria: e.target.value,
                      })
                    }
                    className={getInputStyle('habilitacao_literaria')}
                  >
                    <option value="">Selecione a habilitação literária...</option>
                    {OPCOES_HABILITACAO_LITERARIA.map((hab) => (
                      <option key={hab} value={hab}>
                        {hab}
                      </option>
                    ))}
                  </select>
                  {fieldHasError('habilitacao_literaria') && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Habilitação literária é obrigatória.
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <span>Área ou Ramo de Formação</span>
                    <FieldTooltip
                      title="Área de Formação"
                      content="Indique a área ou ramo de formação (ex: Engenharia Informática, Gestão, Ciências, Eletrotecnia). Será impressa em parênteses na Ficha PDF."
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Engenharia Informática, Gestão, Ciências e Tecnologias..."
                    value={formData.habilitacao_area}
                    onChange={(e) =>
                      setFormData({ ...formData, habilitacao_area: e.target.value })
                    }
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Situação perante o Emprego */}
              <div
                id="campo-situacao_emprego"
                className={`space-y-2 p-3 rounded-xl transition-all ${
                  fieldHasError('situacao_emprego') ? 'border-2 border-rose-500 bg-rose-50/80' : ''
                }`}
              >
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Situação perante o Emprego (Secção 6) *</span>
                  <FieldTooltip
                    title="Situação Laboral Atual"
                    content="Selecione a opção que melhor descreve a sua condição laboral no momento da inscrição."
                  />
                </label>
                {fieldHasError('situacao_emprego') && (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Por favor, selecione uma das opções de situação de emprego.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    {
                      key: 'primeiro_emprego',
                      titulo: 'À procura do 1.º emprego',
                      subtitulo: 'Nunca trabalhou ou busca primeira colocação',
                    },
                    {
                      key: 'novo_emprego',
                      titulo: 'À procura de novo emprego',
                      subtitulo: 'Desempregado à procura de nova oportunidade',
                    },
                    {
                      key: 'empregado',
                      titulo: 'Empregado / Trabalhador',
                      subtitulo: 'Por conta de outrem ou por conta própria',
                    },
                    {
                      key: 'horario_reduzido',
                      titulo: 'Trabalhador com horário reduzido',
                      subtitulo: 'Trabalho a tempo parcial ou sazonal',
                    },
                    {
                      key: 'estudante',
                      titulo: 'Estudante',
                      subtitulo: 'Atualmente a frequentar o ensino regular',
                    },
                  ].map((item) => {
                    const selecionado = formData.situacao_emprego === item.key || formData.situacao_emprego === item.titulo;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            situacao_emprego: item.key,
                            ocupacao: item.titulo,
                          })
                        }
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          selecionado
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {selecionado ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs leading-tight">{item.titulo}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{item.subtitulo}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profissão exercida */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Profissão / Função Atual ou Anterior (se aplicável)
                </label>
                <input
                  type="text"
                  placeholder="Caso exerça ou tenha exercido atividade profissional..."
                  value={formData.profissao}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      profissao: e.target.value,
                      funcao_exerce: e.target.value,
                      atividade_profissional_anterior: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700"
                />
              </div>

              {/* Formação Profissional e Experiência Profissional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <span>Formação Profissional Anterior (Secção 3)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Curso Básico de Eletricidade na Escola Técnica (2024, 120h)..."
                    value={formData.formacao_profissional}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        formacao_profissional: e.target.value,
                      })
                    }
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700 transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <span>Experiência Profissional (Secção 4)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Ajudante de eletricista / canalizador em obras..."
                    value={formData.experiencia_profissional}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experiencia_profissional: e.target.value,
                      })
                    }
                    className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-700 transition-all"
                  />
                </div>
              </div>

              {/* Casos Especiais */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.deficiente}
                        onChange={(e) =>
                          setFormData({ ...formData, deficiente: e.target.checked })
                        }
                        className="rounded border-slate-300 text-emerald-700 w-4 h-4"
                      />
                      <span>Possui necessidade especial ou caso específico (Secção 7)</span>
                    </label>
                    {formData.deficiente && (
                      <input
                        type="text"
                        placeholder="Especifique a necessidade especial..."
                        value={formData.tipo_deficiencia}
                        onChange={(e) =>
                          setFormData({ ...formData, tipo_deficiencia: e.target.value })
                        }
                        className="mt-2 w-full border border-slate-300 rounded bg-white p-2 text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.encaminhado_apoio_social}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            encaminhado_apoio_social: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-emerald-700 w-4 h-4"
                      />
                      <span>Encaminhado por instituição de apoio social</span>
                    </label>
                    {formData.encaminhado_apoio_social && (
                      <input
                        type="text"
                        placeholder="Nome da instituição de apoio social..."
                        value={formData.instituicao_apoio_social}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            instituicao_apoio_social: e.target.value,
                          })
                        }
                        className="mt-2 w-full border border-slate-300 rounded bg-white p-2 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Escolha do Programa e Cursos CFP-STP (1ª e 2ª Opção) */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <BookOpen className="w-5 h-5 text-emerald-700" />
              4. Escolha do Programa e Cursos CFP-STP (Secção 8 — 1.ª e 2.ª Opção)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Programa de Formação *</span>
                  <FieldTooltip
                    title="Programas Formativos"
                    content="Selecione o programa de formação do CFP-STP."
                  />
                </label>
                <select
                  id="campo-programa_id"
                  required
                  value={formData.programa_id || ''}
                  onChange={(e) => handleProgramaChange(Number(e.target.value))}
                  className={getInputStyle('programa_id', true)}
                >
                  <option value="">Selecione o programa de formação...</option>
                  {safeProgramas.map((p) => (
                    <option key={p.id || p.ID} value={p.id || p.ID}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                {fieldHasError('programa_id') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Programa é obrigatório.
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Curso — 1.ª Opção *</span>
                  <FieldTooltip
                    title="1.ª Opção Prioritária"
                    content="O seu curso de maior preferência."
                  />
                </label>
                <select
                  id="campo-curso_opcao1_id"
                  required
                  value={formData.curso_opcao1_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, curso_opcao1_id: Number(e.target.value) })
                  }
                  className={getInputStyle('curso_opcao1_id', true)}
                >
                  <option value="">Selecione o curso (1.ª Opção)...</option>
                  {listaCursosExibida.map((c) => (
                    <option key={c.id || c.ID} value={c.id || c.ID}>
                      {c.nome} ({c.horario || `${c.duracao}h`} · {c.local_realizacao || 'CFP-STP'})
                    </option>
                  ))}
                </select>
                {fieldHasError('curso_opcao1_id') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    1.ª Opção de Curso é obrigatória.
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Curso — 2.ª Opção (Opcional)</span>
                  <FieldTooltip
                    title="2.ª Opção Alternativa"
                    content="Curso alternativo opcional. Não se autoprenche automaticamente."
                  />
                </label>
                <select
                  value={formData.curso_opcao2_id || '0'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      curso_opcao2_id: e.target.value ? Number(e.target.value) : 0,
                    })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-emerald-700"
                >
                  <option value="0">-- Nenhuma (Sem 2.ª Opção) --</option>
                  {safeCursos
                    .filter((c) => Number(c.id || c.ID) !== Number(formData.curso_opcao1_id))
                    .map((c) => (
                      <option key={c.id || c.ID} value={c.id || c.ID}>
                        {c.nome} ({c.programa_nome || `${c.duracao}h`})
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <span>Motivo da Inscrição (Secção 5) *</span>
                  <FieldTooltip
                    title="Motivação"
                    content="Descreva resumidamente os seus objetivos ao escolher esta formação."
                  />
                </label>
                <textarea
                  id="campo-motivo_inscricao"
                  required
                  rows={2}
                  placeholder="Explique o motivo da sua inscrição neste curso..."
                  value={formData.motivo_inscricao}
                  onChange={(e) =>
                    setFormData({ ...formData, motivo_inscricao: e.target.value })
                  }
                  className={getInputStyle('motivo_inscricao')}
                />
                {fieldHasError('motivo_inscricao') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Motivo da inscrição é obrigatório.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 5. Fotografia 3x4 (Obrigatória) e Documentos Comprovativos (Opcionais) */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Upload className="w-5 h-5 text-emerald-700" />
              5. Fotografia Tipo Passe (Obrigatória) e Documentos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* Fotografia - OBRIGATÓRIA (Opção de Carregar do Dispositivo ou Tirar Foto) */}
              <div
                id="campo-foto"
                className={`border-2 rounded-xl p-4 space-y-3 transition-all ${
                  fieldHasError('foto')
                    ? 'border-rose-500 bg-rose-50/90 text-rose-950'
                    : 'border-emerald-300 bg-emerald-50/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-800">
                      <span>Fotografia Tipo Passe *</span>
                      <FieldTooltip
                        title="Foto Oficial Obrigatória"
                        content="Pode carregar uma foto guardada no seu dispositivo ou tirar uma nova foto com a câmara."
                      />
                    </label>
                    <p className="text-[11px] text-slate-500">Impressa na Página 1 da Ficha PDF</p>
                  </div>
                  {fotoPreview && (
                    <div className="relative group shrink-0">
                      <img
                        src={fotoPreview}
                        alt="Foto Passe"
                        className="w-12 h-14 object-cover rounded-lg border-2 border-emerald-600 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFileFoto(null);
                          setFotoPreview('');
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                        title="Remover fotografia"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Duas Opções Claras e Destacadas */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {/* Opção A: Carregar Foto do Dispositivo */}
                  <label className="w-full py-2 px-3 rounded-lg bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 hover:text-emerald-950 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs">
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Carregar Foto do Dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFotoUpload(e.target.files ? e.target.files[0] : null)
                      }
                      className="hidden"
                    />
                  </label>

                  {/* Opção B: Tirar Foto com a Câmara */}
                  <button
                    type="button"
                    onClick={() => setCameraAberta(true)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-white shrink-0" />
                    <span>Tirar Foto com a Câmara</span>
                  </button>
                </div>

                {fileFoto && (
                  <p className="text-[11px] text-emerald-800 font-medium truncate flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{fileFoto.name}</span>
                  </p>
                )}

                {fieldHasError('foto') && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Fotografia tipo passe é obrigatória.
                  </p>
                )}
              </div>

              {/* Documentos Opcionais */}
              <div
                id="campo-bi-doc"
                className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 space-y-2 transition-all"
              >
                <label className="flex items-center gap-1 text-xs font-bold text-slate-800">
                  <span>Cópia do BI / Documento (Opcional)</span>
                </label>
                <p className="text-[11px] text-slate-500">Formato PDF, JPG ou PNG</p>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFileBi(e.target.files ? e.target.files[0] : null)}
                  className="text-xs w-full text-slate-600"
                />
              </div>

              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 space-y-2">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-800">
                  <span>Cópia do NIF (Opcional)</span>
                </label>
                <p className="text-[11px] text-slate-500">Formato PDF, JPG ou PNG</p>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFileNif(e.target.files ? e.target.files[0] : null)}
                  className="text-xs w-full text-slate-600"
                />
              </div>

              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 space-y-2">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-800">
                  <span>Certificado de Habilitações (Opcional)</span>
                </label>
                <p className="text-[11px] text-slate-500">Formato PDF, JPG ou PNG</p>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) =>
                    setFileCertificado(e.target.files ? e.target.files[0] : null)
                  }
                  className="text-xs w-full text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* 6. Autorização e Botão de Submissão */}
          <div
            id="campo-autorizacao_divulgacao_dados"
            className={`p-4 rounded-xl space-y-3 transition-all ${
              fieldHasError('autorizacao_divulgacao_dados')
                ? 'border-2 border-rose-500 bg-rose-50/90 text-rose-950'
                : 'bg-emerald-50/50 border border-emerald-200 text-slate-800'
            }`}
          >
            <label className="flex items-start gap-2.5 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.autorizacao_divulgacao_dados}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    autorizacao_divulgacao_dados: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-300 text-emerald-700 w-4 h-4"
              />
              <span className="font-semibold leading-relaxed flex-1">
                9. — Declaro sob compromisso de honra que as informações fornecidas são verdadeiras e autorizo a utilização dos meus dados para fins pedagógicos e estatísticos da formação profissional, conforme o modelo oficial da Ficha de Inscrição do Formando do CFP-STP. *
              </span>
              <FieldTooltip
                title="Declaração de Veracidade"
                content="Termo legal de responsabilidade exigido pelo Centro de Formação Profissional para validação da candidatura."
              />
            </label>
            {fieldHasError('autorizacao_divulgacao_dados') && (
              <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                Deve aceitar a declaração de veracidade dos dados para submeter.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Ao submeter, a sua Ficha Oficial de 2 páginas em PDF será gerada e transferida automaticamente.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submitting
                ? 'A Registar e Gerar Ficha PDF...'
                : 'Submeter Candidatura e Baixar Ficha Oficial (PDF)'}
            </button>
          </div>
        </form>
      </div>

      <CameraCaptureModal
        aberto={cameraAberta}
        aoFechar={() => setCameraAberta(false)}
        aoCapturar={(file, dataUrl) => {
          setFileFoto(file);
          setFotoPreview(dataUrl);
        }}
      />
    </div>
  );
};
