import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  User,
  MapPin,
  GraduationCap,
  BookOpen,
  FileText,
  CheckCircle2,
  Camera,
  Upload,
  Trash2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Edit3,
  Clock,
  ShieldAlert,
  Loader2,
  Download,
  FileCheck2,
  Search,
} from 'lucide-react';
import {
  fetchCursosBusca,
  extrairProgramasDeCursos,
  SEXOS_PERMITIDOS,
  ESTADOS_CIVIS_PERMITIDOS,
  DISTRITOS_PERMITIDOS,
  NACIONALIDADES_PERMITIDAS,
  ARQUIVOS_IDENTIFICACAO,
  SITUACOES_EMPREGO,
  OPCOES_CASOS_ESPECIAIS,
  HABILITACOES_LITERARIAS_CONFIG,
  formatarCursoLabel,
  CursoItem,
} from '../../data/cursosData';
import {
  DadosInscricaoFormando,
  AnexoDocumento,
  sanitizarEntradaSegura,
  calcularIdade,
  comporHabilitacaoCompleta,
  normalizarTelefoneSTP,
  exigeCertificadoProfissionalPorCurso,
  validarFicheiroSeguranca,
  validarFormularioInscricao,
  LIMITE_TEXTO_CURTO,
  LIMITE_AREA_FORMACAO,
} from '../../utils/securityAndValidation';
import { CameraCaptureModal } from './CameraCaptureModal';
import { FichaComprovativoView } from './FichaComprovativoView';
import { CatalogoCursosView } from './CatalogoCursosView';
import { gerarPdfFormularioInscricao } from '../../utils/gerarPdfInscricao';
import {
  STORAGE_DRAFT_KEY,
  STORAGE_HISTORICO_KEY,
  ETAPAS_WIZARD,
  criarEstadoInicial,
} from './constants/formOptions';
import { ResumoInscricaoSidebar } from './components/ResumoInscricaoSidebar';

interface InscricaoOnlineProps {
  abaAtivaExterna?: 'formulario' | 'catalogo' | 'consultar';
  aoMudarAbaExterna?: (aba: 'formulario' | 'catalogo' | 'consultar') => void;
}

export const InscricaoOnlinePortal: React.FC<InscricaoOnlineProps> = ({
  abaAtivaExterna = 'formulario',
  aoMudarAbaExterna,
}) => {
  const [abaInterna, setAbaInterna] = useState<'formulario' | 'catalogo' | 'consultar'>(
    abaAtivaExterna
  );

  useEffect(() => {
    setAbaInterna(abaAtivaExterna);
  }, [abaAtivaExterna]);

  const mudarAba = (novaAba: 'formulario' | 'catalogo' | 'consultar') => {
    setAbaInterna(novaAba);
    if (aoMudarAbaExterna) aoMudarAbaExterna(novaAba);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Consulta de Cursos via React Query (Cache inteligente para performance Mobile/Desktop)
  const {
    data: cursos = [],
    isLoading: isCursosLoading,
    isError: isCursosError,
    refetch: recarregarCursos,
  } = useQuery({
    queryKey: ['cursos_oficiais_portal'],
    queryFn: () => fetchCursosBusca(),
    staleTime: 5 * 60 * 1000,
  });

  const programas = useMemo(() => extrairProgramasDeCursos(cursos), [cursos]);

  // Estado do formulário preservado entre etapas
  const [dados, setDados] = useState<DadosInscricaoFormando>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_DRAFT_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        return { ...criarEstadoInicial(), ...parsed, foto: null };
      }
    } catch {
      // Ignora rascunho inválido
    }
    return criarEstadoInicial();
  });

  const [etapaAtual, setEtapaAtual] = useState<number>(1);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [alertaGeral, setAlertaGeral] = useState<{
    tipo: 'validacao' | 'conexao' | 'submissao';
    texto: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [inscricaoConcluida, setInscricaoConcluida] =
    useState<DadosInscricaoFormando | null>(null);
  const [cameraModalAberto, setCameraModalAberto] = useState<boolean>(false);

  // Histórico e Pesquisa de Inscrições
  const [historicoInscricoes, setHistoricoInscricoes] = useState<DadosInscricaoFormando[]>(
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_HISTORICO_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  );
  const [termoConsulta, setTermoConsulta] = useState<string>('');
  const [resultadoConsulta, setResultadoConsulta] = useState<DadosInscricaoFormando[]>([]);
  const [consultandoServidor, setConsultandoServidor] = useState<boolean>(false);
  const [mensagemConsulta, setMensagemConsulta] = useState<string | null>(null);

  const fotoInputRef = useRef<HTMLInputElement | null>(null);

  // Guardar rascunho automaticamente sempre que os dados mudam (sem apagar ao trocar de etapa)
  useEffect(() => {
    if (!inscricaoConcluida) {
      try {
        const copiaLeve = { ...dados, foto: undefined };
        localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(copiaLeve));
      } catch {
        // Caso o localStorage atinja limite devido a anexos grandes em base64
      }
    }
  }, [dados, inscricaoConcluida]);

  // Filtragem de cursos da 1.ª Opção: SOMENTE os cursos pertencentes ao programa selecionado
  const cursosPrimeiraOpcao = useMemo(() => {
    if (!dados.programa_id) return [];
    return cursos.filter((c) => Number(c.programa_id) === Number(dados.programa_id));
  }, [cursos, dados.programa_id]);

  // Filtragem de cursos da 2.ª Opção: Independente da 1.ª, pode filtrar por Programa 2.ª Opção ou mostrar todos, impedindo selecionar exatamente o mesmo curso da 1.ª Opção
  const cursosSegundaOpcao = useMemo(() => {
    return cursos.filter((c) => {
      if (dados.curso_id && Number(c.id) === Number(dados.curso_id)) {
        return false; // Impede selecionar o mesmo curso da 1.ª opção
      }
      if (dados.programa_opcao_2_id) {
        return Number(c.programa_id) === Number(dados.programa_opcao_2_id);
      }
      return true;
    });
  }, [cursos, dados.curso_id, dados.programa_opcao_2_id]);

  // Detalhes completos do curso de 1.ª e 2.ª opção selecionados
  const curso1Selecionado = useMemo(
    () => cursos.find((c) => Number(c.id) === Number(dados.curso_id)) || null,
    [cursos, dados.curso_id]
  );

  const curso2Selecionado = useMemo(
    () => cursos.find((c) => Number(c.id) === Number(dados.curso_opcao_2_id)) || null,
    [cursos, dados.curso_opcao_2_id]
  );

  // Regra de negócio baseada em dados (programa_id === 2 -> Estágio Profissional)
  const requerCertificadoProfissional = useMemo(
    () =>
      exigeCertificadoProfissionalPorCurso(
        dados.programa_id,
        dados.curso_id,
        dados.curso_opcao_2_id,
        cursos
      ),
    [dados.programa_id, dados.curso_id, dados.curso_opcao_2_id, cursos]
  );

  // Configuração dependente de Habilitações Literárias
  const nivelHabilitacaoAtual = useMemo(
    () =>
      HABILITACOES_LITERARIAS_CONFIG.find((h) => h.id === dados.habilitacao_nivel) || null,
    [dados.habilitacao_nivel]
  );

  const atualizarCampo = (
    campo: keyof DadosInscricaoFormando,
    valor: any,
    maxLen = 180
  ) => {
    setAlertaGeral(null);
    setDados((prev) => {
      const valorSanitizado =
        typeof valor === 'string' && campo !== 'fotoPreview'
          ? sanitizarEntradaSegura(valor, maxLen)
          : valor;

      const novo = { ...prev, [campo]: valorSanitizado };

      // Cálculo automático de idade ao alterar data de nascimento
      if (campo === 'datanascimento') {
        const idCalc = calcularIdade(String(valorSanitizado));
        novo.idade = idCalc !== null && idCalc >= 0 ? String(idCalc) : '';
      }

      // Normalização de telefone
      if (campo === 'telefone' || campo === 'telefone2') {
        novo[campo] = normalizarTelefoneSTP(String(valorSanitizado));
      }

      // Seleção dependente de Habilitação Literária
      if (campo === 'habilitacao_nivel') {
        novo.habilitacao_classe = '';
        const cfg = HABILITACOES_LITERARIAS_CONFIG.find((h) => h.id === valorSanitizado);
        if (!cfg?.exigeAreaCurso) {
          novo.habilitacao_area = '';
        }
        novo.habilitacao = comporHabilitacaoCompleta(String(valorSanitizado), '', '');
      } else if (campo === 'habilitacao_classe') {
        novo.habilitacao = comporHabilitacaoCompleta(
          prev.habilitacao_nivel,
          String(valorSanitizado),
          prev.habilitacao_area
        );
      } else if (campo === 'habilitacao_area') {
        novo.habilitacao = comporHabilitacaoCompleta(
          prev.habilitacao_nivel,
          prev.habilitacao_classe,
          String(valorSanitizado)
        );
      }

      // Seleção dependente de Programa (1.ª Opção) -> Curso (1.ª Opção)
      if (campo === 'programa_id') {
        const progObj = programas.find((p) => String(p.id) === String(valorSanitizado));
        novo.programa_nome = progObj ? progObj.nome : '';
        novo.curso_id = '';
        novo.curso_nome = '';
        novo.curso_acao = '';
        novo.curso_horario = '';
        novo.curso_local = '';
      }

      if (campo === 'curso_id') {
        const cObj = cursos.find((c) => String(c.id) === String(valorSanitizado));
        if (cObj) {
          novo.curso_nome = cObj.nome.trim();
          novo.curso_acao = cObj.acao;
          novo.curso_horario =
            cObj.horario && cObj.horario_termino
              ? `${cObj.horario}–${cObj.horario_termino}`
              : cObj.horario || '';
          novo.curso_local = cObj.local_realizacao;
          novo.programa_id = String(cObj.programa_id);
          novo.programa_nome = cObj.programa_nome;
          novo.ano = String(cObj.ano_execucao || '2026');

          // Se a 2.ª opção tinha o mesmo curso, limpa a 2.ª opção para evitar conflito
          if (String(prev.curso_opcao_2_id) === String(cObj.id)) {
            novo.curso_opcao_2_id = '';
            novo.curso_opcao_2_nome = '';
            novo.curso_opcao_2_programa = '';
            novo.curso_opcao_2_horario = '';
            novo.curso_opcao_2_local = '';
          }
        } else {
          novo.curso_nome = '';
          novo.curso_acao = '';
          novo.curso_horario = '';
          novo.curso_local = '';
        }
      }

      // Seleção de Programa (2.ª Opção) -> Curso (2.ª Opção)
      if (campo === 'programa_opcao_2_id') {
        if (prev.curso_opcao_2_id) {
          const c2Atual = cursos.find(
            (c) => String(c.id) === String(prev.curso_opcao_2_id)
          );
          if (
            valorSanitizado &&
            c2Atual &&
            String(c2Atual.programa_id) !== String(valorSanitizado)
          ) {
            novo.curso_opcao_2_id = '';
            novo.curso_opcao_2_nome = '';
            novo.curso_opcao_2_programa = '';
            novo.curso_opcao_2_horario = '';
            novo.curso_opcao_2_local = '';
          }
        }
      }

      if (campo === 'curso_opcao_2_id') {
        const c2Obj = cursos.find((c) => String(c.id) === String(valorSanitizado));
        if (c2Obj) {
          novo.curso_opcao_2_nome = c2Obj.nome.trim();
          novo.curso_opcao_2_programa = c2Obj.programa_nome;
          novo.curso_opcao_2_horario =
            c2Obj.horario && c2Obj.horario_termino
              ? `${c2Obj.horario}–${c2Obj.horario_termino}`
              : c2Obj.horario || '';
          novo.curso_opcao_2_local = c2Obj.local_realizacao;
          novo.programa_opcao_2_id = String(c2Obj.programa_id);
        } else {
          novo.curso_opcao_2_nome = '';
          novo.curso_opcao_2_programa = '';
          novo.curso_opcao_2_horario = '';
          novo.curso_opcao_2_local = '';
        }
      }

      return novo;
    });

    if (erros[campo]) {
      setErros((prev) => {
        const copia = { ...prev };
        delete copia[campo];
        return copia;
      });
    }
  };

  // Handler para upload seguro de fotografia do dispositivo
  const handleUploadFotografia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validacao = await validarFicheiroSeguranca(file, 'foto');
    if (!validacao.valido) {
      setErros((prev) => ({ ...prev, foto: validacao.erro || 'Fotografia inválida.' }));
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDados((prev) => ({
          ...prev,
          foto: file,
          fotoPreview: reader.result as string,
          fotoDimensoes: validacao.dimensoes || null,
        }));
        setErros((prev) => {
          const copia = { ...prev };
          delete copia.foto;
          return copia;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handler para upload seguro de documentos (BI, NIF, Certificados)
  const handleUploadDocumento = async (
    campo:
      | 'doc_bi'
      | 'doc_nif'
      | 'doc_certificado_habilitacao'
      | 'doc_certificado_profissional',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validacao = await validarFicheiroSeguranca(file, 'documento');
    if (!validacao.valido) {
      setErros((prev) => ({ ...prev, [campo]: validacao.erro || 'Documento inválido.' }));
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const anexo: AnexoDocumento = {
          nomeFicheiro: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
          tipoMime: file.type,
          tamanhoBytes: file.size,
          dataUrl: reader.result,
          file,
        };
        atualizarCampo(campo, anexo);
      }
    };
    reader.readAsDataURL(file);
  };

  const avancarEtapa = () => {
    const resultado = validarFormularioInscricao(dados, cursos, etapaAtual);
    if (!resultado.valido) {
      setErros(resultado.erros);
      setAlertaGeral({
        tipo: 'validacao',
        texto: 'Verifique os campos assinalados.',
      });
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }
    setErros({});
    setAlertaGeral(null);
    setEtapaAtual((prev) => Math.min(6, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const voltarEtapa = () => {
    setAlertaGeral(null);
    setEtapaAtual((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const irParaEtapa = (destino: number) => {
    if (destino < etapaAtual) {
      setAlertaGeral(null);
      setEtapaAtual(destino);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (destino > etapaAtual) {
      const resultado = validarFormularioInscricao(dados, cursos, etapaAtual);
      if (!resultado.valido) {
        setErros(resultado.erros);
        setAlertaGeral({
          tipo: 'validacao',
          texto: 'Verifique os campos assinalados antes de avançar.',
        });
        return;
      }
      setErros({});
      setAlertaGeral(null);
      setEtapaAtual(destino);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Converter DataURL para Blob caso o utilizador tenha recarregado a página do rascunho
  const dataUrlParaBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  // Submissão Final para o Backend com validação completa e prevenção de duplo clique
  const handleSubmeterInscricao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validar todas as etapas (1 a 6)
    const validacaoGlobal = validarFormularioInscricao(dados, cursos);
    if (!validacaoGlobal.valido) {
      setErros(validacaoGlobal.erros);
      setAlertaGeral({
        tipo: 'validacao',
        texto: 'Verifique os campos assinalados.',
      });
      return;
    }

    setIsSubmitting(true);
    setAlertaGeral(null);

    try {
      const formData = new FormData();

      // Campos textuais e IDs reais
      const camposSimples: Array<keyof DadosInscricaoFormando> = [
        'nome',
        'nome_pai',
        'nome_mae',
        'bi',
        'arquivo_identificacao',
        'nif',
        'datanascimento',
        'idade',
        'sexo',
        'nacionalidade',
        'naturalidade',
        'estado_civil',
        'agregado_familiar',
        'morada',
        'distrito',
        'telefone',
        'telefone2',
        'email',
        'ocupacao',
        'habilitacao_nivel',
        'habilitacao_classe',
        'habilitacao_area',
        'habilitacao',
        'formacao_profissional',
        'experiencia_profissional',
        'motivo_inscricao',
        'situacao_emprego',
        'possui_caso_especial',
        'casos_especiais',
        'programa_id',
        'curso_id',
        'programa_opcao_2_id',
        'curso_opcao_2_id',
        'ano',
      ];

      for (const c of camposSimples) {
        formData.append(c, String(dados[c] || ''));
      }

      // Anexar Fotografia
      if (dados.foto) {
        formData.append('foto', dados.foto, dados.foto.name);
      } else if (dados.fotoPreview) {
        const blob = await dataUrlParaBlob(dados.fotoPreview);
        formData.append('foto', blob, 'foto_passe.jpg');
      }

      // Anexar Documentos
      const anexarDoc = async (
        chave:
          | 'doc_bi'
          | 'doc_nif'
          | 'doc_certificado_habilitacao'
          | 'doc_certificado_profissional'
      ) => {
        const docObj = dados[chave];
        if (!docObj) return;
        if (docObj.file) {
          formData.append(chave, docObj.file, docObj.nomeFicheiro);
        } else if (docObj.dataUrl) {
          const blob = await dataUrlParaBlob(docObj.dataUrl);
          formData.append(chave, blob, docObj.nomeFicheiro || `${chave}.pdf`);
        }
      };

      await anexarDoc('doc_bi');
      await anexarDoc('doc_nif');
      await anexarDoc('doc_certificado_habilitacao');
      await anexarDoc('doc_certificado_profissional');

      const response = await axios.post('/api/inscricoes/submeter', formData);

      if (response.data?.sucesso && response.data?.inscricao) {
        const registoServidor = response.data.inscricao;
        const inscricaoFinal: DadosInscricaoFormando = {
          ...dados,
          ...registoServidor,
          fotoPreview: dados.fotoPreview,
          doc_bi: dados.doc_bi,
          doc_nif: dados.doc_nif,
          doc_certificado_habilitacao: dados.doc_certificado_habilitacao,
          doc_certificado_profissional: dados.doc_certificado_profissional,
        };

        setInscricaoConcluida(inscricaoFinal);
        localStorage.removeItem(STORAGE_DRAFT_KEY);

        const novoHistorico = [
          { ...inscricaoFinal, foto: null },
          ...historicoInscricoes.filter((h) => h.protocolo !== inscricaoFinal.protocolo),
        ].slice(0, 15);
        setHistoricoInscricoes(novoHistorico);
        try {
          localStorage.setItem(STORAGE_HISTORICO_KEY, JSON.stringify(novoHistorico));
        } catch {
          // Ignora excesso de quota de armazenamento local
        }

        // Baixar imediatamente o ficheiro do formulário preenchido em PDF ao terminar a inscrição
        setTimeout(() => {
          gerarPdfFormularioInscricao(inscricaoFinal);
        }, 150);

        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      if (!err.response) {
        // Fallback resiliente caso o servidor esteja temporariamente indisponível
        const anoExec = String(dados.ano || new Date().getFullYear());
        const sufixoLocal = Math.floor(100000 + Math.random() * 900000);
        const inscricaoFinalLocal: DadosInscricaoFormando = {
          ...dados,
          protocolo: dados.protocolo || `CFP-${anoExec}-${sufixoLocal}`,
          data_inscricao: new Date().toISOString().split('T')[0],
          situacao: 'Inscrito',
        };
        setInscricaoConcluida(inscricaoFinalLocal);
        localStorage.removeItem(STORAGE_DRAFT_KEY);
        const novoHistorico = [
          { ...inscricaoFinalLocal, foto: null },
          ...historicoInscricoes,
        ].slice(0, 15);
        setHistoricoInscricoes(novoHistorico);
        try {
          localStorage.setItem(STORAGE_HISTORICO_KEY, JSON.stringify(novoHistorico));
        } catch {
          // Ignora excesso de quota
        }
        setTimeout(() => {
          gerarPdfFormularioInscricao(inscricaoFinalLocal);
        }, 150);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      } else if (err.response.status === 400 && err.response.data?.erros) {
        setErros(err.response.data.erros);
        setAlertaGeral({
          tipo: 'validacao',
          texto: err.response.data.mensagem || 'Verifique os campos assinalados.',
        });
      } else {
        setAlertaGeral({
          tipo: 'submissao',
          texto:
            err.response.data?.mensagem ||
            'Não foi possível concluir a submissão da inscrição. Por favor, verifique os dados e tente novamente.',
        });
      }
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const iniciarNovaInscricao = () => {
    setInscricaoConcluida(null);
    setDados(criarEstadoInicial());
    setErros({});
    setAlertaGeral(null);
    setEtapaAtual(1);
    localStorage.removeItem(STORAGE_DRAFT_KEY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelecionarCursoDoCatalogo = (curso: CursoItem) => {
    setInscricaoConcluida(null);
    setDados((prev) => ({
      ...prev,
      programa_id: String(curso.programa_id),
      programa_nome: curso.programa_nome,
      curso_id: String(curso.id),
      curso_nome: curso.nome.trim(),
      curso_acao: curso.acao,
      curso_horario:
        curso.horario && curso.horario_termino
          ? `${curso.horario}–${curso.horario_termino}`
          : curso.horario || '',
      curso_local: curso.local_realizacao,
      ano: String(curso.ano_execucao || '2026'),
    }));
    mudarAba('formulario');
  };

  const handleConsultarInscricao = async (e: React.FormEvent) => {
    e.preventDefault();
    const termo = sanitizarEntradaSegura(termoConsulta, 40).trim().toUpperCase();
    if (!termo) return;

    setConsultandoServidor(true);
    setMensagemConsulta(null);

    try {
      const res = await axios.get(`/api/inscricoes/consulta/${encodeURIComponent(termo)}`);
      const doServidor: DadosInscricaoFormando[] = res.data?.inscricoes || [];

      const locais = historicoInscricoes.filter(
        (h) =>
          h.protocolo?.toUpperCase() === termo ||
          h.bi?.toUpperCase() === termo ||
          h.nif === termo
      );

      // Mesclar dando preferência à cópia com fotoPreview em cache
      const mapa = new Map<string, DadosInscricaoFormando>();
      [...doServidor, ...locais].forEach((item) => {
        const existente = mapa.get(item.protocolo);
        if (!existente || (!existente.fotoPreview && item.fotoPreview)) {
          mapa.set(item.protocolo, item);
        }
      });

      const lista = Array.from(mapa.values());
      setResultadoConsulta(lista);
      if (lista.length === 0) {
        setMensagemConsulta(
          'Nenhuma inscrição encontrada para o código de protocolo, BI ou NIF informado.'
        );
      }
    } catch {
      const locais = historicoInscricoes.filter(
        (h) =>
          h.protocolo?.toUpperCase() === termo ||
          h.bi?.toUpperCase() === termo ||
          h.nif === termo
      );
      setResultadoConsulta(locais);
      if (locais.length === 0) {
        setMensagemConsulta(
          'Não foi possível localizar inscrições com os dados informados.'
        );
      }
    } finally {
      setConsultandoServidor(false);
    }
  };

  // Se estiver na aba de Catálogo de Cursos
  if (abaInterna === 'catalogo') {
    return (
      <CatalogoCursosView
        cursos={cursos}
        programas={programas}
        isLoading={isCursosLoading}
        aoSelecionarCurso={handleSelecionarCursoDoCatalogo}
      />
    );
  }

  // Se estiver na aba de Consultar / Baixar Comprovativo
  if (abaInterna === 'consultar') {
    return (
      <div className="w-full space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-xl font-bold text-slate-900">
            Consultar Inscrição e Baixar Formulário Preenchido em PDF
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Introduza o seu Código de Inscrição (ex: CFP-2026-XXXXXX), Número de Bilhete de Identidade ou NIF para visualizar e descarregar o ficheiro PDF da sua Ficha de Inscrição.
          </p>

          <form
            onSubmit={handleConsultarInscricao}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={termoConsulta}
                onChange={(e) => setTermoConsulta(e.target.value)}
                placeholder="Código de Protocolo, Nº de BI ou NIF..."
                className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={consultandoServidor}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              {consultandoServidor ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Pesquisar Inscrição</span>
            </button>
          </form>

          {mensagemConsulta && (
            <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              {mensagemConsulta}
            </p>
          )}
        </div>

        {/* Lista de Resultados ou Histórico Recente em Grelha Larga */}
        {(resultadoConsulta.length > 0 ? resultadoConsulta : historicoInscricoes).length >
        0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">
              {resultadoConsulta.length > 0
                ? 'Resultados da pesquisa'
                : 'Inscrições submetidas recentemente neste dispositivo'}
            </h3>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {(resultadoConsulta.length > 0 ? resultadoConsulta : historicoInscricoes).map(
                (item) => (
                  <div
                    key={item.protocolo || item.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono-tabular font-semibold text-emerald-700">
                          {item.protocolo}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">BI: {item.bi}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">Data: {item.data_inscricao}</span>
                      </div>
                      <h4 className="mt-1 text-base font-bold text-slate-900">{item.nome}</h4>
                      <p className="mt-0.5 text-xs text-slate-600">
                        1.ª Opção: <strong>{item.curso_nome}</strong> ({item.programa_nome})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setInscricaoConcluida(item);
                          mudarAba('formulario');
                        }}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ver Ficha Completa
                      </button>
                      <button
                        type="button"
                        onClick={() => gerarPdfFormularioInscricao(item)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Baixar PDF
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">
              Ainda não existem inscrições submetidas nesta sessão.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Se a inscrição acabou de ser submetida com sucesso, apresentar a Página de Confirmação e Ficha Preenchida
  if (inscricaoConcluida) {
    return (
      <FichaComprovativoView
        dados={inscricaoConcluida}
        aoNovaInscricao={iniciarNovaInscricao}
        aoEditarInscricao={() => {
          setDados({ ...inscricaoConcluida, aceita_declaracao: true });
          setInscricaoConcluida(null);
          setEtapaAtual(6);
        }}
      />
    );
  }

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Coluna Principal do Assistente de Inscrição (Largura Expandida) */}
      <div className="xl:col-span-8 2xl:col-span-9 space-y-6">
      {/* Indicador de Progresso Responsivo (Mobile First + Desktop) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              Etapa {etapaAtual} de {ETAPAS_WIZARD.length}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {ETAPAS_WIZARD[etapaAtual - 1].numero}.{' '}
              {ETAPAS_WIZARD[etapaAtual - 1].titulo} —{' '}
              <span className="font-normal text-slate-600">
                {ETAPAS_WIZARD[etapaAtual - 1].desc}
              </span>
            </h2>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-slate-600">
            {Math.round((etapaAtual / ETAPAS_WIZARD.length) * 100)}%
          </span>
        </div>

        {/* Barra de progresso contínua */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-emerald-700 transition-transform duration-200 origin-left"
            style={{
              transform: `scaleX(${etapaAtual / ETAPAS_WIZARD.length})`,
            }}
          />
        </div>

        {/* Navegação de etapas em Desktop/Tablet */}
        <div className="mt-4 hidden md:grid md:grid-cols-6 gap-2">
          {ETAPAS_WIZARD.map((step) => {
            const Icon = step.icone;
            const ativo = etapaAtual === step.numero;
            const concluido = etapaAtual > step.numero;
            return (
              <button
                key={step.numero}
                type="button"
                onClick={() => irParaEtapa(step.numero)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                  ativo
                    ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950'
                    : concluido
                    ? 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                    : 'border-transparent bg-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-mono-tabular font-semibold ${
                    ativo
                      ? 'bg-emerald-700 text-white'
                      : concluido
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {concluido ? '✓' : step.numero}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{step.titulo}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alertas de Erro de Validação, Conexão ou Submissão (Secção 32) */}
      {alertaGeral && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            alertaGeral.tipo === 'validacao'
              ? 'border-red-200 bg-red-50 text-red-900'
              : alertaGeral.tipo === 'conexao'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold">{alertaGeral.texto}</p>
            {Object.keys(erros).length > 0 && (
              <p className="mt-0.5 text-xs opacity-90">
                Foram detetados {Object.keys(erros).length} campo(s) que requerem a sua atenção.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Formulário Principal */}
      <form
        onSubmit={handleSubmeterInscricao}
        noValidate
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs"
      >
        {/* ================================================================
            ETAPA 1 — DADOS PESSOAIS
           ================================================================ */}
        {etapaAtual === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                01. Dados Pessoais e Identificação Civil
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Preencha exatamente como consta no seu Bilhete de Identidade ou documento oficial. Os campos com <span className="text-red-600">*</span> são obrigatórios.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
              {/* Nome Completo */}
              <div className="md:col-span-8">
                <label
                  htmlFor="campo-nome"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nome Completo do Candidato <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-nome"
                  type="text"
                  value={dados.nome}
                  onChange={(e) => atualizarCampo('nome', e.target.value, 120)}
                  placeholder="Ex.: João Manuel da Trindade dos Santos"
                  aria-invalid={!!erros.nome}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.nome
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.nome && (
                  <p className="mt-1 text-xs font-medium text-red-600">{erros.nome}</p>
                )}
              </div>

              {/* Sexo (Estrito: Masculino / Feminino) */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-sexo"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Sexo <span className="text-red-600">*</span>
                </label>
                <select
                  id="campo-sexo"
                  value={dados.sexo}
                  onChange={(e) => atualizarCampo('sexo', e.target.value, 20)}
                  aria-invalid={!!erros.sexo}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.sexo
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                >
                  <option value="">Selecione...</option>
                  {SEXOS_PERMITIDOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {erros.sexo && (
                  <p className="mt-1 text-xs font-medium text-red-600">{erros.sexo}</p>
                )}
              </div>

              {/* Filiação: Nome do Pai */}
              <div className="md:col-span-6">
                <label
                  htmlFor="campo-nome-pai"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Filiação — Nome Completo do Pai <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-nome-pai"
                  type="text"
                  value={dados.nome_pai}
                  onChange={(e) => atualizarCampo('nome_pai', e.target.value, 120)}
                  placeholder="Nome completo do pai"
                  aria-invalid={!!erros.nome_pai}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.nome_pai
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.nome_pai && (
                  <p className="mt-1 text-xs font-medium text-red-600">{erros.nome_pai}</p>
                )}
              </div>

              {/* Filiação: Nome da Mãe */}
              <div className="md:col-span-6">
                <label
                  htmlFor="campo-nome-mae"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Filiação — Nome Completo da Mãe <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-nome-mae"
                  type="text"
                  value={dados.nome_mae}
                  onChange={(e) => atualizarCampo('nome_mae', e.target.value, 120)}
                  placeholder="Nome completo da mãe"
                  aria-invalid={!!erros.nome_mae}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.nome_mae
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.nome_mae && (
                  <p className="mt-1 text-xs font-medium text-red-600">{erros.nome_mae}</p>
                )}
              </div>

              {/* Número do Bilhete de Identidade */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-bi"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nº de Bilhete de Identidade / Doc. <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-bi"
                  type="text"
                  value={dados.bi}
                  onChange={(e) => atualizarCampo('bi', e.target.value.toUpperCase(), 20)}
                  placeholder="Ex.: 123456"
                  aria-invalid={!!erros.bi}
                  className={`w-full min-h-[44px] font-mono-tabular rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.bi
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.bi && (
                  <p className="mt-1 text-xs font-medium text-red-600">{erros.bi}</p>
                )}
              </div>

              {/* Arquivo de Identificação */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-arquivo-id"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Arquivo de Identificação <span className="text-red-600">*</span>
                </label>
                <select
                  id="campo-arquivo-id"
                  value={dados.arquivo_identificacao}
                  onChange={(e) =>
                    atualizarCampo('arquivo_identificacao', e.target.value, 100)
                  }
                  aria-invalid={!!erros.arquivo_identificacao}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.arquivo_identificacao
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                >
                  <option value="">Selecione...</option>
                  {ARQUIVOS_IDENTIFICACAO.map((arq) => (
                    <option key={arq} value={arq}>
                      {arq}
                    </option>
                  ))}
                </select>
                {erros.arquivo_identificacao && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.arquivo_identificacao}
                  </p>
                )}
              </div>

              {/* NIF / Cartão de Contribuinte */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-nif"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  NIF / Nº Cartão de Contribuinte <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-nif"
                  type="text"
                  inputMode="numeric"
                  value={dados.nif}
                  onChange={(e) =>
                    atualizarCampo('nif', e.target.value.replace(/\D/g, ''), 15)
                  }
                  placeholder="Ex.: 912345678"
                  aria-invalid={!!erros.nif}
                  className={`w-full min-h-[44px] font-mono-tabular rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.nif
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.nif && (
                  <p className="mt-1 text-xs font-medium text-red-600">{erros.nif}</p>
                )}
              </div>

              {/* Data de Nascimento */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-datanascimento"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Data de Nascimento <span className="text-red-600">*</span>
                  {dados.idade && (
                    <span className="ml-2 font-mono-tabular font-normal text-emerald-700">
                      ({dados.idade} anos)
                    </span>
                  )}
                </label>
                <input
                  id="campo-datanascimento"
                  type="date"
                  value={dados.datanascimento}
                  onChange={(e) => atualizarCampo('datanascimento', e.target.value, 12)}
                  aria-invalid={!!erros.datanascimento}
                  className={`w-full min-h-[44px] font-mono-tabular rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.datanascimento
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.datanascimento && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.datanascimento}
                  </p>
                )}
              </div>

              {/* Estado Civil (Controlado) */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-estado-civil"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Estado Civil <span className="text-red-600">*</span>
                </label>
                <select
                  id="campo-estado-civil"
                  value={dados.estado_civil}
                  onChange={(e) => atualizarCampo('estado_civil', e.target.value, 30)}
                  aria-invalid={!!erros.estado_civil}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.estado_civil
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                >
                  <option value="">Selecione...</option>
                  {ESTADOS_CIVIS_PERMITIDOS.map((ec) => (
                    <option key={ec} value={ec}>
                      {ec}
                    </option>
                  ))}
                </select>
                {erros.estado_civil && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.estado_civil}
                  </p>
                )}
              </div>

              {/* Nº de Agregado Familiar */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-agregado"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nº do Agregado Familiar <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-agregado"
                  type="number"
                  min={1}
                  max={35}
                  value={dados.agregado_familiar}
                  onChange={(e) =>
                    atualizarCampo(
                      'agregado_familiar',
                      e.target.value.replace(/\D/g, ''),
                      2
                    )
                  }
                  placeholder="Ex.: 4"
                  aria-invalid={!!erros.agregado_familiar}
                  className={`w-full min-h-[44px] font-mono-tabular rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.agregado_familiar
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.agregado_familiar && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.agregado_familiar}
                  </p>
                )}
              </div>

              {/* Nacionalidade */}
              <div className="md:col-span-6">
                <label
                  htmlFor="campo-nacionalidade"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nacionalidade <span className="text-red-600">*</span>
                </label>
                <select
                  id="campo-nacionalidade"
                  value={dados.nacionalidade}
                  onChange={(e) => atualizarCampo('nacionalidade', e.target.value, 40)}
                  aria-invalid={!!erros.nacionalidade}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.nacionalidade
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                >
                  <option value="">Selecione...</option>
                  {NACIONALIDADES_PERMITIDAS.map((nac) => (
                    <option key={nac} value={nac}>
                      {nac}
                    </option>
                  ))}
                </select>
                {erros.nacionalidade && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.nacionalidade}
                  </p>
                )}
              </div>

              {/* Local de Nascimento (Naturalidade) */}
              <div className="md:col-span-6">
                <label
                  htmlFor="campo-naturalidade"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Local de Nascimento (Naturalidade) <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-naturalidade"
                  type="text"
                  value={dados.naturalidade}
                  onChange={(e) => atualizarCampo('naturalidade', e.target.value, 80)}
                  placeholder="Ex.: Conceição - Água Grande"
                  aria-invalid={!!erros.naturalidade}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.naturalidade
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.naturalidade && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.naturalidade}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            ETAPA 2 — MORADA E CONTACTOS
           ================================================================ */}
        {etapaAtual === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                02. Morada e Contactos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Indique a sua residência atual e os números de telefone para contacto pelo Centro de Formação.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
              {/* Distrito (Valores Controlados Oficiais) */}
              <div className="md:col-span-5">
                <label
                  htmlFor="campo-distrito"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Distrito de Residência <span className="text-red-600">*</span>
                </label>
                <select
                  id="campo-distrito"
                  value={dados.distrito}
                  onChange={(e) => atualizarCampo('distrito', e.target.value, 60)}
                  aria-invalid={!!erros.distrito}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.distrito
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                >
                  <option value="">Selecione o Distrito...</option>
                  {DISTRITOS_PERMITIDOS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {erros.distrito && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.distrito}
                  </p>
                )}
              </div>

              {/* Morada */}
              <div className="md:col-span-7">
                <label
                  htmlFor="campo-morada"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Morada / Localidade <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-morada"
                  type="text"
                  value={dados.morada}
                  onChange={(e) => atualizarCampo('morada', e.target.value, 120)}
                  placeholder="Ex.: Bairro da Boa Morte, Rua Principal"
                  aria-invalid={!!erros.morada}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.morada
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.morada && (
                  <p className="mt-1 text-xs font-medium text-red-600">{erros.morada}</p>
                )}
              </div>

              {/* Contacto Telefónico Principal */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-telefone"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Contacto Telefónico <span className="text-red-600">*</span>
                </label>
                <input
                  id="campo-telefone"
                  type="tel"
                  value={dados.telefone}
                  onChange={(e) => atualizarCampo('telefone', e.target.value, 18)}
                  placeholder="Ex.: 9912345"
                  aria-invalid={!!erros.telefone}
                  className={`w-full min-h-[44px] font-mono-tabular rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.telefone
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.telefone && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.telefone}
                  </p>
                )}
              </div>

              {/* Outro Contacto */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-telefone2"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Outro Contacto (Opcional)
                </label>
                <input
                  id="campo-telefone2"
                  type="tel"
                  value={dados.telefone2}
                  onChange={(e) => atualizarCampo('telefone2', e.target.value, 18)}
                  placeholder="Ex.: 9876543"
                  aria-invalid={!!erros.telefone2}
                  className={`w-full min-h-[44px] font-mono-tabular rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.telefone2
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.telefone2 && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.telefone2}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="md:col-span-4">
                <label
                  htmlFor="campo-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="campo-email"
                  type="email"
                  value={dados.email}
                  onChange={(e) => atualizarCampo('email', e.target.value, 100)}
                  placeholder="nome@exemplo.st"
                  aria-invalid={!!erros.email}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.email
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.email && (
                  <p className="mt-1 text-xs font-medium text-red-600">{erros.email}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            ETAPA 3 — FORMAÇÃO ACADÉMICA, PROFISSIONAL, EMPREGO E CASOS ESPECIAIS
           ================================================================ */}
        {etapaAtual === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                03. Formação Académica, Profissional e Situação Perante o Emprego
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione o seu nível de ensino concluído, a respetiva classe ou grau académico e descreva de forma resumida a sua experiência.
              </p>
            </div>

            {/* Bloco de Seleção Dependente de Habilitação Literária */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <p className="text-xs font-semibold text-slate-800 mb-3">
                Habilitações Literárias Concluídas (Seleção Dependente)
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                {/* Ciclo / Nível de Ensino */}
                <div className="md:col-span-6">
                  <label
                    htmlFor="campo-hab-nivel"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Nível / Ciclo de Ensino <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="campo-hab-nivel"
                    value={dados.habilitacao_nivel}
                    onChange={(e) =>
                      atualizarCampo('habilitacao_nivel', e.target.value, 80)
                    }
                    aria-invalid={!!erros.habilitacao_nivel}
                    className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                      erros.habilitacao_nivel
                        ? 'border-red-500 bg-red-50/30'
                        : 'border-slate-300 bg-white focus:border-emerald-700'
                    }`}
                  >
                    <option value="">Selecione o ciclo ou nível...</option>
                    {HABILITACOES_LITERARIAS_CONFIG.map((cfg) => (
                      <option key={cfg.id} value={cfg.id}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                  {erros.habilitacao_nivel && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {erros.habilitacao_nivel}
                    </p>
                  )}
                </div>

                {/* Classe / Grau Dependente */}
                <div className="md:col-span-6">
                  <label
                    htmlFor="campo-hab-classe"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    {nivelHabilitacaoAtual
                      ? nivelHabilitacaoAtual.labelEspecificacao
                      : 'Classe / Grau Concluído'}{' '}
                    <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="campo-hab-classe"
                    value={dados.habilitacao_classe}
                    onChange={(e) =>
                      atualizarCampo('habilitacao_classe', e.target.value, 60)
                    }
                    disabled={!nivelHabilitacaoAtual}
                    aria-invalid={!!erros.habilitacao_classe}
                    className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none ${
                      erros.habilitacao_classe
                        ? 'border-red-500 bg-red-50/30'
                        : 'border-slate-300 bg-white focus:border-emerald-700'
                    }`}
                  >
                    <option value="">
                      {nivelHabilitacaoAtual
                        ? `Selecione ${nivelHabilitacaoAtual.labelEspecificacao.toLowerCase()}...`
                        : 'Selecione primeiro o nível de ensino'}
                    </option>
                    {nivelHabilitacaoAtual?.opcoes.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  {erros.habilitacao_classe && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {erros.habilitacao_classe}
                    </p>
                  )}
                </div>

                {/* Área / Curso de Formação (Quando Ensino Superior ou Técnico-Profissional) */}
                {nivelHabilitacaoAtual?.exigeAreaCurso && (
                  <div className="md:col-span-12">
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="campo-hab-area"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Área / Curso de Formação ({dados.habilitacao_classe || 'Superior / Técnico'}){' '}
                        <span className="text-red-600">*</span>
                      </label>
                      <span className="font-mono-tabular text-[11px] text-slate-500">
                        {dados.habilitacao_area.length} / {LIMITE_AREA_FORMACAO} caracteres
                      </span>
                    </div>
                    <input
                      id="campo-hab-area"
                      type="text"
                      value={dados.habilitacao_area}
                      onChange={(e) =>
                        atualizarCampo(
                          'habilitacao_area',
                          e.target.value,
                          LIMITE_AREA_FORMACAO
                        )
                      }
                      placeholder={nivelHabilitacaoAtual.placeholderArea}
                      aria-invalid={!!erros.habilitacao_area}
                      className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                        erros.habilitacao_area
                          ? 'border-red-500 bg-red-50/30'
                          : 'border-slate-300 bg-white focus:border-emerald-700'
                      }`}
                    />
                    {erros.habilitacao_area && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {erros.habilitacao_area}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {dados.habilitacao && (
                <p className="mt-3 text-xs text-slate-600">
                  Registo académico formatado:{' '}
                  <strong className="text-slate-900">{dados.habilitacao}</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
              {/* Situação Perante o Emprego */}
              <div className="md:col-span-6">
                <label
                  htmlFor="campo-situacao-emprego"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Situação do Candidato Perante o Emprego{' '}
                  <span className="text-red-600">*</span>
                </label>
                <select
                  id="campo-situacao-emprego"
                  value={dados.situacao_emprego}
                  onChange={(e) =>
                    atualizarCampo('situacao_emprego', e.target.value, 80)
                  }
                  aria-invalid={!!erros.situacao_emprego}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.situacao_emprego
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                >
                  <option value="">Selecione a situação...</option>
                  {SITUACOES_EMPREGO.map((sit) => (
                    <option key={sit} value={sit}>
                      {sit}
                    </option>
                  ))}
                </select>
                {erros.situacao_emprego && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.situacao_emprego}
                  </p>
                )}
              </div>

              {/* Ocupação Atual (Ponto 1) e Profissão (Ponto 6.4) */}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="campo-ocupacao"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Ocupação Atual <span className="text-red-600">*</span>
                  </label>
                </div>
                <input
                  id="campo-ocupacao"
                  type="text"
                  value={dados.ocupacao}
                  onChange={(e) => atualizarCampo('ocupacao', e.target.value, 80)}
                  placeholder="Ex.: Estudante, Comerciante..."
                  aria-invalid={!!erros.ocupacao}
                  className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.ocupacao
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.ocupacao && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.ocupacao}
                  </p>
                )}
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="campo-profissao"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  4. Profissão (Ficha Ponto 6.4)
                </label>
                <input
                  id="campo-profissao"
                  type="text"
                  value={dados.profissao || ''}
                  onChange={(e) => atualizarCampo('profissao', e.target.value, 80)}
                  placeholder="Ex.: Eletricista, Carpinteiro..."
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
              </div>

              {/* Campos condicionais da Secção 6 (Página 2 da Ficha Oficial) */}
              {dados.situacao_emprego.toLowerCase().includes('novo emprego') && (
                <div className="md:col-span-12">
                  <label
                    htmlFor="campo-ativ-anterior"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Actividade profissional anterior (Ponto 6.2 da Ficha)
                  </label>
                  <input
                    id="campo-ativ-anterior"
                    type="text"
                    value={dados.atividade_profissional_anterior || ''}
                    onChange={(e) =>
                      atualizarCampo('atividade_profissional_anterior', e.target.value, 100)
                    }
                    placeholder="Indique a atividade profissional exercida anteriormente..."
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              )}

              {(dados.situacao_emprego.toLowerCase().includes('empregado') ||
                dados.situacao_emprego.toLowerCase().includes('trabalhador')) &&
                !dados.situacao_emprego.toLowerCase().includes('desempregado') && (
                  <>
                    <div className="md:col-span-8">
                      <label
                        htmlFor="campo-funcao-exerce"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Função que exerce (Ponto 6.3 da Ficha)
                      </label>
                      <input
                        id="campo-funcao-exerce"
                        type="text"
                        value={dados.funcao_exerce || ''}
                        onChange={(e) =>
                          atualizarCampo('funcao_exerce', e.target.value, 80)
                        }
                        placeholder="Indique a função que exerce atualmente..."
                        className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label
                        htmlFor="campo-funcao-desde"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Desde (Ano / Data)
                      </label>
                      <input
                        id="campo-funcao-desde"
                        type="text"
                        value={dados.funcao_desde || ''}
                        onChange={(e) =>
                          atualizarCampo('funcao_desde', e.target.value, 30)
                        }
                        placeholder="Ex.: 2023"
                        className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                      />
                    </div>
                  </>
                )}

              {/* Formação Profissional (Texto curto controlado) */}
              <div className="md:col-span-6">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="campo-formacao-prof"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Formação Profissional que possui (Texto curto)
                  </label>
                  <span className="font-mono-tabular text-[11px] text-slate-500">
                    {dados.formacao_profissional.length} / {LIMITE_TEXTO_CURTO} máx.
                  </span>
                </div>
                <textarea
                  id="campo-formacao-prof"
                  rows={3}
                  value={dados.formacao_profissional}
                  onChange={(e) =>
                    atualizarCampo(
                      'formacao_profissional',
                      e.target.value,
                      LIMITE_TEXTO_CURTO
                    )
                  }
                  placeholder="Indique cursos profissionais realizados anteriormente (ou deixe em branco caso não possua)."
                  aria-invalid={!!erros.formacao_profissional}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.formacao_profissional
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.formacao_profissional && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.formacao_profissional}
                  </p>
                )}
              </div>

              {/* Experiência Profissional (Texto curto controlado) */}
              <div className="md:col-span-6">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="campo-experiencia-prof"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Experiência Profissional (Texto curto)
                  </label>
                  <span className="font-mono-tabular text-[11px] text-slate-500">
                    {dados.experiencia_profissional.length} / {LIMITE_TEXTO_CURTO} máx.
                  </span>
                </div>
                <textarea
                  id="campo-experiencia-prof"
                  rows={3}
                  value={dados.experiencia_profissional}
                  onChange={(e) =>
                    atualizarCampo(
                      'experiencia_profissional',
                      e.target.value,
                      LIMITE_TEXTO_CURTO
                    )
                  }
                  placeholder="Descreva resumidamente a sua experiência profissional relevante."
                  aria-invalid={!!erros.experiencia_profissional}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                    erros.experiencia_profissional
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                {erros.experiencia_profissional && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {erros.experiencia_profissional}
                  </p>
                )}
              </div>

              {/* 7- Casos Especiais (Secção 7 da Ficha Oficial) */}
              <div className="md:col-span-12 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-4">
                <p className="text-xs font-bold text-slate-900">
                  7 - Casos Especiais (Preenchimento conforme Ficha Oficial — Página 2/2)
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label
                      htmlFor="campo-possui-caso-especial"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Deficiente / Possui Caso Especial?
                    </label>
                    <select
                      id="campo-possui-caso-especial"
                      value={dados.possui_caso_especial}
                      onChange={(e) => {
                        const val = e.target.value as 'Não' | 'Sim';
                        atualizarCampo('possui_caso_especial', val, 10);
                        if (val === 'Não') {
                          atualizarCampo('casos_especiais', '', 10);
                        }
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>

                  {dados.possui_caso_especial === 'Sim' && (
                    <div className="md:col-span-8">
                      <label
                        htmlFor="campo-casos-especiais"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Especifique a deficiência ou necessidade especial{' '}
                        <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="campo-casos-especiais"
                        value={dados.casos_especiais}
                        onChange={(e) =>
                          atualizarCampo('casos_especiais', e.target.value, 150)
                        }
                        aria-invalid={!!erros.casos_especiais}
                        className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                          erros.casos_especiais
                            ? 'border-red-500 bg-red-50/30'
                            : 'border-slate-300 bg-white focus:border-emerald-700'
                        }`}
                      >
                        <option value="">Selecione a condição...</option>
                        {OPCOES_CASOS_ESPECIAIS.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      {erros.casos_especiais && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {erros.casos_especiais}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-4">
                    <label
                      htmlFor="campo-encaminhado-apoio"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Encaminhado por Instituição de Apoio Social?
                    </label>
                    <select
                      id="campo-encaminhado-apoio"
                      value={dados.encaminhado_apoio_social || 'Não'}
                      onChange={(e) =>
                        atualizarCampo('encaminhado_apoio_social', e.target.value, 10)
                      }
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label
                      htmlFor="campo-instituicao-apoio"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Qual Instituição de Apoio Social?
                    </label>
                    <input
                      id="campo-instituicao-apoio"
                      type="text"
                      value={dados.instituicao_apoio_social || ''}
                      onChange={(e) =>
                        atualizarCampo('instituicao_apoio_social', e.target.value, 80)
                      }
                      placeholder="Indique se aplicável..."
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label
                      htmlFor="campo-outra-inst"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Encaminhado por outra instituição (Qual)
                    </label>
                    <input
                      id="campo-outra-inst"
                      type="text"
                      value={dados.encaminhado_outra_instituicao || ''}
                      onChange={(e) =>
                        atualizarCampo('encaminhado_outra_instituicao', e.target.value, 80)
                      }
                      placeholder="Indique se aplicável..."
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            ETAPA 4 — ESCOLHA DO PROGRAMA, 1.ª E 2.ª OPÇÃO DE CURSO E MOTIVO
           ================================================================ */}
        {etapaAtual === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  04. Seleção de Programa, Cursos (1.ª e 2.ª Opção) e Motivação
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ao selecionar o Programa, a 1.ª Opção apresenta apenas os cursos desse programa. Para a 2.ª Opção, pode escolher qualquer outro curso disponível.
                </p>
              </div>
              {isCursosError && (
                <button
                  type="button"
                  onClick={() => recarregarCursos()}
                  className="text-xs font-semibold text-emerald-700 underline"
                >
                  Recarregar cursos da API
                </button>
              )}
            </div>

            {/* PRIMEIRA OPÇÃO */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
              <p className="text-xs font-bold text-emerald-800 mb-3">
                Primeira Opção de Candidatura (Obrigatória)
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                {/* Programa — 1.ª Opção */}
                <div className="md:col-span-5">
                  <label
                    htmlFor="campo-programa-1"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Programa — 1.ª Opção <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="campo-programa-1"
                    value={dados.programa_id}
                    onChange={(e) => atualizarCampo('programa_id', e.target.value, 20)}
                    disabled={isCursosLoading}
                    aria-invalid={!!erros.programa_id}
                    className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                      erros.programa_id
                        ? 'border-red-500 bg-red-50/30'
                        : 'border-slate-300 bg-white focus:border-emerald-700'
                    }`}
                  >
                    <option value="">
                      {isCursosLoading
                        ? 'A carregar programas da API...'
                        : 'Selecione o Programa...'}
                    </option>
                    {programas.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.nome} ({prog.totalCursos} curso
                        {prog.totalCursos > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                  {erros.programa_id && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {erros.programa_id}
                    </p>
                  )}
                </div>

                {/* Curso — 1.ª Opção (Apenas cursos pertencentes ao programa selecionado) */}
                <div className="md:col-span-7">
                  <label
                    htmlFor="campo-curso-1"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Curso — 1.ª Opção (Cursos do programa selecionado){' '}
                    <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="campo-curso-1"
                    value={dados.curso_id}
                    onChange={(e) => atualizarCampo('curso_id', e.target.value, 20)}
                    disabled={!dados.programa_id || isCursosLoading}
                    aria-invalid={!!erros.curso_id}
                    className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none ${
                      erros.curso_id
                        ? 'border-red-500 bg-red-50/30'
                        : 'border-slate-300 bg-white focus:border-emerald-700'
                    }`}
                  >
                    <option value="">
                      {!dados.programa_id
                        ? 'Selecione primeiro o Programa ao lado...'
                        : 'Selecione o Curso de 1.ª Opção...'}
                    </option>
                    {cursosPrimeiraOpcao.map((curso) => (
                      <option key={curso.id} value={curso.id}>
                        {formatarCursoLabel(curso, false)}
                      </option>
                    ))}
                  </select>
                  {erros.curso_id && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {erros.curso_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Detalhes informativos do Curso de 1.ª Opção */}
              {curso1Selecionado && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3.5 text-xs text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="font-semibold text-slate-900">
                    {curso1Selecionado.nome.trim()}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Local: {curso1Selecionado.local_realizacao}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Horário: {curso1Selecionado.horario}–
                    {curso1Selecionado.horario_termino}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Ação: {curso1Selecionado.acao}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Turma: {curso1Selecionado.alunos_por_turma}
                  </span>
                </div>
              )}
            </div>

            {/* SEGUNDA OPÇÃO */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-bold text-slate-800 mb-3">
                Segunda Opção de Candidatura (Todos os cursos disponíveis exceto a 1.ª Opção)
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                {/* Programa — 2.ª Opção */}
                <div className="md:col-span-5">
                  <label
                    htmlFor="campo-programa-2"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Programa — 2.ª Opção (Filtro opcional)
                  </label>
                  <select
                    id="campo-programa-2"
                    value={dados.programa_opcao_2_id}
                    onChange={(e) =>
                      atualizarCampo('programa_opcao_2_id', e.target.value, 20)
                    }
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                  >
                    <option value="">
                      Todos os Programas (Mostrar todos os cursos)
                    </option>
                    {programas.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Curso — 2.ª Opção */}
                <div className="md:col-span-7">
                  <label
                    htmlFor="campo-curso-2"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Curso — 2.ª Opção
                  </label>
                  <select
                    id="campo-curso-2"
                    value={dados.curso_opcao_2_id}
                    onChange={(e) =>
                      atualizarCampo('curso_opcao_2_id', e.target.value, 20)
                    }
                    aria-invalid={!!erros.curso_opcao_2_id}
                    className={`w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                      erros.curso_opcao_2_id
                        ? 'border-red-500 bg-red-50/30'
                        : 'border-slate-300 bg-white focus:border-emerald-700'
                    }`}
                  >
                    <option value="">
                      Selecione um curso de 2.ª opção (Opcional)...
                    </option>
                    {cursosSegundaOpcao.map((curso) => (
                      <option key={curso.id} value={curso.id}>
                        {formatarCursoLabel(curso, !dados.programa_opcao_2_id)}
                      </option>
                    ))}
                  </select>
                  {erros.curso_opcao_2_id && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {erros.curso_opcao_2_id}
                    </p>
                  )}
                </div>
              </div>

              {curso2Selecionado && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="font-semibold text-slate-900">
                    {curso2Selecionado.nome.trim()}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Programa: {curso2Selecionado.programa_nome}</span>
                  <span aria-hidden="true">·</span>
                  <span>Local: {curso2Selecionado.local_realizacao}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Horário: {curso2Selecionado.horario}–
                    {curso2Selecionado.horario_termino}
                  </span>
                </div>
              )}
            </div>

            {/* Aviso automático sobre Programa de Estágio Profissional (programa_id = 2) */}
            {requerCertificadoProfissional && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
                <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Requisito Especial — Programa de Estágio Profissional (ID: 2)
                  </p>
                  <p className="mt-0.5 text-amber-900">
                    Como selecionou o Programa de Estágio Profissional, na próxima etapa será obrigatório anexar a cópia do seu <strong>Certificado de Habilitação Profissional</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Motivo da Inscrição (Texto curto controlado) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="campo-motivo"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Motivo da Inscrição no Centro de Formação neste curso{' '}
                  <span className="text-red-600">*</span>
                </label>
                <span className="font-mono-tabular text-[11px] text-slate-500">
                  {dados.motivo_inscricao.length} / {LIMITE_TEXTO_CURTO} caracteres permitidos
                </span>
              </div>
              <textarea
                id="campo-motivo"
                rows={3}
                value={dados.motivo_inscricao}
                onChange={(e) =>
                  atualizarCampo(
                    'motivo_inscricao',
                    e.target.value,
                    LIMITE_TEXTO_CURTO
                  )
                }
                placeholder="Explique numa frase curta porque pretende frequentar este curso no CFP-STP (mín. 10, máx. 180 caracteres)..."
                aria-invalid={!!erros.motivo_inscricao}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                  erros.motivo_inscricao
                    ? 'border-red-500 bg-red-50/30'
                    : 'border-slate-300 bg-white focus:border-emerald-700'
                }`}
              />
              {erros.motivo_inscricao && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {erros.motivo_inscricao}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            ETAPA 5 — FOTOGRAFIA TIPO PASSE E DOCUMENTOS
           ================================================================ */}
        {etapaAtual === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                05. Fotografia Tipo Passe e Documentos Obrigatórios
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Carregue ou tire a sua fotografia tipo passe e anexe as cópias legíveis dos seus documentos (PDF, JPG ou PNG até 5 MB).
              </p>
            </div>

            {/* Secção de Fotografia Tipo Passe */}
            <div
              className={`rounded-xl border p-5 ${
                erros.foto
                  ? 'border-red-300 bg-red-50/20'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="h-36 w-28 shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center relative">
                  {dados.fotoPreview ? (
                    <img
                      src={dados.fotoPreview}
                      alt="Pré-visualização da foto do candidato"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <Camera className="mx-auto h-6 w-6 text-slate-400" />
                      <span className="mt-1 block text-[11px] font-medium text-slate-400">
                        Foto 3x4
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Fotografia do Candidato (Tipo Passe){' '}
                      <span className="text-red-600">*</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Formatos aceites: JPG, PNG ou WEBP (mínimo 120x120px, máximo 5 MB). Pode usar a câmara do seu telemóvel, tablet ou computador.
                    </p>
                    {dados.fotoDimensoes && (
                      <p className="mt-1 text-xs font-mono-tabular text-emerald-700">
                        Dimensões verificadas: {dados.fotoDimensoes.width} ×{' '}
                        {dados.fotoDimensoes.height} px
                      </p>
                    )}
                  </div>

                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUploadFotografia}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCameraModalAberto(true)}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Tirar Fotografia com a Câmara
                    </button>

                    <button
                      type="button"
                      onClick={() => fotoInputRef.current?.click()}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Upload className="h-4 w-4" />
                      {dados.fotoPreview
                        ? 'Substituir do Dispositivo'
                        : 'Selecionar do Dispositivo'}
                    </button>

                    {dados.fotoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setDados((prev) => ({
                            ...prev,
                            foto: null,
                            fotoPreview: '',
                            fotoDimensoes: null,
                          }));
                        }}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </button>
                    )}
                  </div>

                  {erros.foto && (
                    <p className="text-xs font-medium text-red-600">{erros.foto}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Grelha de Upload de Documentos */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                {
                  campo: 'doc_bi' as const,
                  titulo: 'Cópia do Bilhete de Identidade / Doc. Identificação',
                  obrigatorio: true,
                  subtitulo: 'Frente e verso legíveis (PDF, JPG ou PNG)',
                },
                {
                  campo: 'doc_nif' as const,
                  titulo: 'Cópia do Cartão de Contribuinte (NIF)',
                  obrigatorio: true,
                  subtitulo: 'Comprovativo de Número de Identificação Fiscal (PDF, JPG ou PNG)',
                },
                {
                  campo: 'doc_certificado_habilitacao' as const,
                  titulo: 'Cópia do Certificado de Habilitação Literária',
                  obrigatorio: true,
                  subtitulo: `Comprovativo de ${dados.habilitacao || 'habilitações literárias'}`,
                },
                {
                  campo: 'doc_certificado_profissional' as const,
                  titulo: 'Cópia do Certificado de Habilitação Profissional',
                  obrigatorio: requerCertificadoProfissional,
                  subtitulo: requerCertificadoProfissional
                    ? 'OBRIGATÓRIO para candidatura ao Programa de Estágio Profissional'
                    : 'Opcional (Obrigatório apenas para Programa de Estágio Profissional)',
                },
              ].map((docItem) => {
                const valorAtual = dados[docItem.campo];
                const erroCampo = erros[docItem.campo];

                return (
                  <div
                    key={docItem.campo}
                    className={`flex flex-col justify-between rounded-xl border p-4 ${
                      erroCampo
                        ? 'border-red-300 bg-red-50/20'
                        : valorAtual
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900">
                          {docItem.titulo}{' '}
                          {docItem.obrigatorio && (
                            <span className="text-red-600">*</span>
                          )}
                        </h4>
                        {valorAtual && (
                          <FileCheck2 className="h-4 w-4 text-emerald-700 shrink-0" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {docItem.subtitulo}
                      </p>
                    </div>

                    <div className="mt-4">
                      {valorAtual ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {valorAtual.nomeFicheiro}
                            </p>
                            <p className="font-mono-tabular text-[11px] text-slate-500">
                              {(valorAtual.tamanhoBytes / 1024).toFixed(1)} KB · Verificado
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => atualizarCampo(docItem.campo, null)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remover documento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                          <Upload className="h-4 w-4 text-slate-500" />
                          <span>Carregar Documento (PDF / Imagem)</span>
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) =>
                              handleUploadDocumento(docItem.campo, e)
                            }
                            className="hidden"
                          />
                        </label>
                      )}

                      {erroCampo && (
                        <p className="mt-1.5 text-xs font-medium text-red-600">
                          {erroCampo}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================
            ETAPA 6 — PÁGINA DE REVISÃO ANTES DA SUBMISSÃO (Secção 23)
           ================================================================ */}
        {etapaAtual === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                06. Revisão Completa dos Dados antes da Submissão
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirme atentamente todas as informações inseridas. Se precisar de corrigir algum dado, clique em &ldquo;Editar&rdquo; na respetiva secção.
              </p>
            </div>

            {/* Resumo 1: Dados Pessoais + Fotografia */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-bold text-slate-900">
                  1. Dados Pessoais e Identificação
                </h4>
                <button
                  type="button"
                  onClick={() => irParaEtapa(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Dados Pessoais
                </button>
              </div>

              <div className="flex flex-col gap-5 sm:flex-row">
                {dados.fotoPreview && (
                  <img
                    src={dados.fotoPreview}
                    alt="Foto do candidato"
                    className="h-28 w-22 rounded-lg border border-slate-200 object-cover shrink-0"
                  />
                )}
                <dl className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
                  <div>
                    <dt className="text-slate-500">Nome Completo</dt>
                    <dd className="font-semibold text-slate-900 mt-0.5">{dados.nome}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Data de Nascimento · Sexo</dt>
                    <dd className="font-mono-tabular font-medium text-slate-900 mt-0.5">
                      {dados.datanascimento} ({dados.idade} anos) · {dados.sexo}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Estado Civil · Agregado</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">
                      {dados.estado_civil} · {dados.agregado_familiar} pessoa(s)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">BI · Arquivo</dt>
                    <dd className="font-mono-tabular font-medium text-slate-900 mt-0.5">
                      {dados.bi} ({dados.arquivo_identificacao})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">NIF / Contribuinte</dt>
                    <dd className="font-mono-tabular font-medium text-slate-900 mt-0.5">
                      {dados.nif}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Nacionalidade · Naturalidade</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">
                      {dados.nacionalidade} · {dados.naturalidade}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Nome do Pai</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{dados.nome_pai}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Nome da Mãe</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{dados.nome_mae}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Resumo 2: Morada e Contactos */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-bold text-slate-900">
                  2. Morada e Contactos
                </h4>
                <button
                  type="button"
                  onClick={() => irParaEtapa(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Contactos
                </button>
              </div>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 text-xs">
                <div>
                  <dt className="text-slate-500">Distrito</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{dados.distrito}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Morada</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{dados.morada}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Telefones</dt>
                  <dd className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                    {dados.telefone}
                    {dados.telefone2 ? ` / ${dados.telefone2}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {dados.email || 'Não indicado'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Resumo 3: Formação e Experiência */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-bold text-slate-900">
                  3. Habilitações Literárias, Experiência e Situação Social
                </h4>
                <button
                  type="button"
                  onClick={() => irParaEtapa(3)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Formação
                </button>
              </div>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
                <div>
                  <dt className="text-slate-500">Habilitação Literária Concluída</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {dados.habilitacao}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Situação Perante o Emprego · Ocupação</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {dados.situacao_emprego} ({dados.ocupacao})
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Casos Especiais</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {dados.possui_caso_especial === 'Sim'
                      ? dados.casos_especiais
                      : 'Não possui'}
                  </dd>
                </div>
                <div className="sm:col-span-3">
                  <dt className="text-slate-500">Formação e Experiência Profissional</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    Formação: {dados.formacao_profissional || 'Nenhuma'} · Experiência:{' '}
                    {dados.experiencia_profissional || 'Nenhuma'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Resumo 4: Cursos Escolhidos */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-bold text-slate-900">
                  4. Programa, 1.ª e 2.ª Opção de Curso e Motivo
                </h4>
                <button
                  type="button"
                  onClick={() => irParaEtapa(4)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Cursos
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-lg bg-emerald-50/50 border border-emerald-200 p-3">
                  <p className="font-semibold text-emerald-800">
                    1.ª Opção · {dados.programa_nome}
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {dados.curso_nome}
                  </p>
                  <p className="text-slate-600 mt-1 font-mono-tabular">
                    {dados.curso_local} · {dados.curso_horario} · Ação {dados.curso_acao}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="font-semibold text-slate-700">2.ª Opção</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {dados.curso_opcao_2_nome || 'Não selecionada'}
                  </p>
                  {dados.curso_opcao_2_nome && (
                    <p className="text-slate-600 mt-1 font-mono-tabular">
                      {dados.curso_opcao_2_programa} · {dados.curso_opcao_2_local} (
                      {dados.curso_opcao_2_horario})
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-700">
                <span className="text-slate-500">Motivo da inscrição:</span>{' '}
                {dados.motivo_inscricao}
              </p>
            </div>

            {/* Resumo 5: Documentos */}
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-bold text-slate-900">
                  5. Fotografia e Documentos Anexados
                </h4>
                <button
                  type="button"
                  onClick={() => irParaEtapa(5)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Documentos
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Fotografia Tipo Passe carregada</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span className="truncate">
                    BI: {dados.doc_bi?.nomeFicheiro || 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span className="truncate">
                    NIF: {dados.doc_nif?.nomeFicheiro || 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span className="truncate">
                    Cert. Habilitação:{' '}
                    {dados.doc_certificado_habilitacao?.nomeFicheiro || 'Pendente'}
                  </span>
                </div>
                {dados.doc_certificado_profissional && (
                  <div className="flex items-center gap-2 text-slate-800 sm:col-span-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span className="truncate">
                      Cert. Profissional:{' '}
                      {dados.doc_certificado_profissional.nomeFicheiro}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Ponto 9 da Ficha Oficial: Autorização de Divulgação de Dados */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-xs font-bold text-slate-900">
                9. – Caso seja selecionado, permitirá que seus dados sejam divulgados?
              </span>
              <div className="flex items-center gap-5 text-xs font-semibold text-slate-800">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoriza_divulgacao_dados"
                    checked={(dados.autoriza_divulgacao_dados || 'Sim') === 'Sim'}
                    onChange={() => atualizarCampo('autoriza_divulgacao_dados', 'Sim', 5)}
                    className="h-4 w-4 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>Sim</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoriza_divulgacao_dados"
                    checked={dados.autoriza_divulgacao_dados === 'Não'}
                    onChange={() => atualizarCampo('autoriza_divulgacao_dados', 'Não', 5)}
                    className="h-4 w-4 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>Não</span>
                </label>
              </div>
            </div>

            {/* Declaração de Compromisso Final */}
            <div
              className={`rounded-xl border p-4 ${
                erros.aceita_declaracao
                  ? 'border-red-300 bg-red-50/30'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dados.aceita_declaracao}
                  onChange={(e) =>
                    atualizarCampo('aceita_declaracao', e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
                <span className="text-xs text-slate-800 leading-relaxed">
                  <strong>Declaração sob compromisso de honra:</strong> Confirmo que revi todos os dados pessoais, académicos, opções de curso e documentos anexados, e declaro que as informações prestadas são verdadeiras.
                </span>
              </label>
              {erros.aceita_declaracao && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {erros.aceita_declaracao}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Barra de Botões de Navegação entre Etapas (Mobile First & Touch Friendly) */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {etapaAtual > 1 && (
              <button
                type="button"
                onClick={voltarEtapa}
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {etapaAtual < 6 ? (
              <button
                type="button"
                onClick={avancarEtapa}
                className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <span>Continuar</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    gerarPdfFormularioInscricao({
                      ...dados,
                      protocolo: dados.protocolo || `CFP-${dados.ano || '2026'}-PREVIA`,
                    })
                  }
                  className="w-full sm:w-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-50/70 px-5 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/80 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-4 w-4 text-emerald-700" />
                  <span>Baixar Prévia em PDF</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-7 py-3 text-sm font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>A concluir e gerar PDF...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Concluir Inscrição e Baixar PDF</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </form>
      </div>

      {/* Coluna Lateral: Resumo em Tempo Real da Ficha e Acesso Rápido ao PDF */}
      <ResumoInscricaoSidebar
        dados={dados}
        historicoInscricoes={historicoInscricoes}
      />

      {/* Modal de Captura de Fotografia pela Câmara */}
      <CameraCaptureModal
        aberto={cameraModalAberto}
        aoFechar={() => setCameraModalAberto(false)}
        aoCapturar={(file, dataUrl) => {
          setDados((prev) => ({
            ...prev,
            foto: file,
            fotoPreview: dataUrl,
            fotoDimensoes: { width: 600, height: 800 },
          }));
          setErros((prev) => {
            const copia = { ...prev };
            delete copia.foto;
            return copia;
          });
        }}
      />
    </div>
  );
};
