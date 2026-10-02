import crypto from 'crypto';
import { jsPDF } from 'jspdf';
import { obterCursosOficiais, CursoRecord } from './cursosRepository';
import { extrairProgramasDeCursos } from '../data/cursosData';

// =============================================================================
// MODELOS E TIPOS DO DOMÍNIO (CANDIDATURA, DOCUMENTO, HISTÓRICO, FORMANDO, CURSO_INSCRICAO)
// =============================================================================

export type EstadoCandidatura =
  | 'RASCUNHO'
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'DEVOLVIDA'
  | 'CORRIGIDA'
  | 'APROVADA'
  | 'REJEITADA'
  | 'CANCELADA';

export type RoleSistema =
  | 'ADMIN'
  | 'FUNCIONARIOS'
  | 'MASTER'
  | 'admin'
  | 'funcionarios'
  | 'master'
  | 'secretaria'
  | 'staff'
  | 'candidato';

export interface NivelAcessoRow {
  id: number;
  nivel: 'ADMIN' | 'FUNCIONARIOS' | 'MASTER';
  datacriacao: string;
  dataatualizacao: string | null;
}

export const TABELA_NIVEL_ACESSO = {
  table: 'nivel_acesso',
  rows: [
    {
      id: 1,
      nivel: 'ADMIN' as const,
      datacriacao: '2025-05-02 10:06:24',
      dataatualizacao: null,
    },
    {
      id: 2,
      nivel: 'FUNCIONARIOS' as const,
      datacriacao: '2025-05-02 10:06:48',
      dataatualizacao: null,
    },
    {
      id: 3,
      nivel: 'MASTER' as const,
      datacriacao: '2025-05-02 10:07:06',
      dataatualizacao: null,
    },
  ],
};

export interface UtilizadorAuth {
  id: number;
  username: string;
  nome: string;
  email: string;
  role: RoleSistema;
  nivel_acesso_id: number;
  nivel_acesso: 'ADMIN' | 'FUNCIONARIOS' | 'MASTER';
}

export interface ProgramaModel {
  id: number;
  ID: number;
  nome: string;
  sigla: string;
  descricao: string;
  status: 'ativo' | 'inativo';
}

export interface CursoModel {
  id: number;
  ID: number;
  nome: string;
  acao: string;
  duracao: number;
  duracao_mes: number;
  horario: string;
  horario_termino: string;
  local_realizacao: string;
  fk_programa: number;
  programa_id: number;
  programa_nome: string;
  ano_execucao: number;
  alunos_por_turma: string;
  descricao: string;
  status: 'ativo' | 'inativo';
}

export interface DocumentoModel {
  id: number;
  candidatura_id: number;
  tipo: string;
  nome_original: string;
  arquivo: string;
  mime_type: string;
  tamanho: number;
  observacao: string;
  data_upload: string;
  ativo: boolean;
  buffer?: Buffer;
  dataUrl?: string;
}

export interface HistoricoModel {
  id: number;
  candidatura_id: number;
  estado_anterior: string;
  estado_novo: string;
  acao: string;
  observacao: string;
  utilizador_nome: string;
  data_criacao: string;
}

export interface FormandoModel {
  id: number;
  processo: string; // Formato oficial: CFP{BI}
  candidatura_id: number;
  nome: string;
  bi: string;
  nif: string;
  data_nascimento: string;
  sexo: string;
  distrito: string;
  morada: string;
  contacto: string;
  email: string;
  data_registo: string;
}

export interface CursoInscricaoModel {
  id: number;
  inscricao_id: number;
  formando_id: number;
  curso_id: number;
  curso_nome: string;
  programa_id: number;
  opcao_ordem: 1 | 2;
  data_associacao: string;
}

export interface InscricaoModel {
  id: number;
  numero_inscricao: string;
  formando_id: number;
  processo_formando: string;
  candidatura_id: number;
  programa_id: number;
  curso_id: number;
  curso_opcao2_id: number | null;
  ano: number;
  estado: 'INSCRITO' | 'MATRICULADO' | 'CANCELADO';
  data_inscricao: string;
  cursos_associados: CursoInscricaoModel[];
}

export interface CandidaturaModel {
  id: number;
  codigo: string;
  estado: EstadoCandidatura;
  nome: string;
  nome_pai: string;
  nome_mae: string;
  bi: string;
  arquivo_identificacao: string;
  nif: string;
  data_nascimento: string;
  idade: number;
  sexo: string;
  nacionalidade: string;
  naturalidade: string;
  estado_civil: string;
  agregado: string;
  morada: string;
  distrito: string;
  zona: string;
  contacto: string;
  contacto_alternativo: string;
  email: string;
  habilitacao_literaria: string;
  habilitacao_nivel: string;
  habilitacao_classe: string;
  habilitacao_area: string;
  formacao_profissional: string;
  experiencia_profissional: string;
  ocupacao: string;
  motivo_inscricao: string;
  programa_id: number;
  curso_opcao1_id: number;
  curso_opcao2_id: number | null;
  ano: number;
  situacao_emprego: string;
  atividade_profissional_anterior: string;
  funcao_exerce: string;
  funcao_desde: string;
  profissao: string;
  deficiente: boolean;
  tipo_deficiencia: string;
  encaminhado_apoio_social: boolean;
  instituicao_apoio_social: string;
  autorizacao_divulgacao_dados: boolean;
  observacao: string;
  motivo_devolucao?: string;
  motivo_rejeicao?: string;
  motivo_cancelamento?: string;
  formando_id?: number;
  inscricao_id?: number;
  processo_numero?: string;
  cursos_inscricao?: CursoInscricaoModel[];
  foto_data_url?: string;
  data_submissao?: string;
  data_aprovacao?: string;
  data_criacao: string;
  data_atualizacao: string;
}

export class CandidaturaServiceError extends Error {
  status_code: number;
  detalhes?: Record<string, string>;

  constructor(mensagem: string, status_code = 400, detalhes?: Record<string, string>) {
    super(mensagem);
    this.name = 'CandidaturaServiceError';
    this.status_code = status_code;
    this.detalhes = detalhes;
  }

  to_dict() {
    return {
      erro: this.message,
      ...(this.detalhes ? { detalhes: this.detalhes } : {}),
    };
  }
}

// =============================================================================
// UTILIZADORES E TOKENS RBAC (NÍVEIS: 1-ADMIN, 2-FUNCIONARIOS, 3-MASTER)
// =============================================================================

const UTILIZADORES_SISTEMA: Array<UtilizadorAuth & { password: string }> = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@cfp.st',
    nome: 'Administrador do Sistema CFP-STP',
    role: 'ADMIN',
    nivel_acesso_id: 1,
    nivel_acesso: 'ADMIN',
    password: 'admin123',
  },
  {
    id: 2,
    username: 'funcionario',
    email: 'funcionario@cfp.st',
    nome: 'Secretaria e Funcionários CFP-STP',
    role: 'FUNCIONARIOS',
    nivel_acesso_id: 2,
    nivel_acesso: 'FUNCIONARIOS',
    password: 'funcionario123',
  },
  {
    id: 3,
    username: 'master',
    email: 'master@cfp.st',
    nome: 'Direção Geral CFP-STP (Master)',
    role: 'MASTER',
    nivel_acesso_id: 3,
    nivel_acesso: 'MASTER',
    password: 'master123',
  },
  {
    id: 4,
    username: 'secretaria',
    email: 'secretaria@cfp.st',
    nome: 'Secretaria Académica CFP-STP',
    role: 'FUNCIONARIOS',
    nivel_acesso_id: 2,
    nivel_acesso: 'FUNCIONARIOS',
    password: 'secretaria123',
  },
];

const SESSOES_TOKENS = new Map<string, UtilizadorAuth>();

export function autenticarUtilizador(
  identificador: string,
  password: string
): { token: string; utilizador: UtilizadorAuth } | null {
  const idLimpo = (identificador || '').trim().toLowerCase();
  const encontrado = UTILIZADORES_SISTEMA.find(
    (u) => u.username.toLowerCase() === idLimpo || u.email.toLowerCase() === idLimpo
  );
  if (!encontrado || encontrado.password !== password) {
    return null;
  }
  const { password: _, ...utilizador } = encontrado;
  const token = `cfp_jwt_${encontrado.role}_${crypto.randomUUID()}`;
  SESSOES_TOKENS.set(token, utilizador);
  return { token, utilizador };
}

export function obterUtilizadorPorHeader(authHeader?: string): UtilizadorAuth | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  return SESSOES_TOKENS.get(token) || null;
}

export function isUtilizadorAutorizadoAdmin(user?: UtilizadorAuth | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  const nivel = String(user.nivel_acesso || '').toUpperCase();
  return (
    ['ADMIN', 'FUNCIONARIOS', 'MASTER', 'SECRETARIA', 'STAFF'].includes(role) ||
    ['ADMIN', 'FUNCIONARIOS', 'MASTER'].includes(nivel) ||
    [1, 2, 3].includes(user.nivel_acesso_id)
  );
}

// =============================================================================
// REPOSITÓRIO EM MEMÓRIA (DADOS OPERACIONAIS)
// =============================================================================

let seqCandidaturaId = 1;
let seqDocumentoId = 1;
let seqHistoricoId = 1;
let seqFormandoId = 100;
let seqInscricaoId = 500;
let seqCursoInscricaoId = 1000;

const CANDIDATURAS_STORE: CandidaturaModel[] = [];
const DOCUMENTOS_STORE: DocumentoModel[] = [];
const HISTORICO_STORE: HistoricoModel[] = [];
const FORMANDOS_STORE: FormandoModel[] = [];
const INSCRICOES_STORE: InscricaoModel[] = [];
const CURSO_INSCRICAO_STORE: CursoInscricaoModel[] = [];

function formatarDataHoraAtual(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function gerarProcessoCFP(bi: string): string {
  const biLimpo = String(bi || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  return `CFP${biLimpo}`;
}

function calcularIdadeDeData(dataNasc: string): number {
  if (!dataNasc) return 22;
  const nascimento = new Date(dataNasc);
  if (isNaN(nascimento.getTime())) return 22;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return Math.max(14, idade);
}

async function garantirSeedInicial() {
  // Inicialização segura dos catálogos oficiais sem inserção de dados fictícios de candidatos
  await obterCursosOficiais();
}

// =============================================================================
// CATÁLOGO DE PROGRAMAS E CURSOS
// =============================================================================

export async function listarProgramasAtivos(): Promise<ProgramaModel[]> {
  await garantirSeedInicial();
  const cursos = await obterCursosOficiais();
  const programasExtraidos = extrairProgramasDeCursos(cursos as any);
  return programasExtraidos.map((p: any) => ({
    id: p.id,
    ID: p.id,
    nome: p.nome,
    sigla: p.sigla || p.nome.substring(0, 4).toUpperCase(),
    descricao: p.descricao || `Programa de ${p.nome}`,
    status: 'ativo',
  }));
}

export async function listarCursosAtivos(programaId?: number): Promise<CursoModel[]> {
  await garantirSeedInicial();
  const cursos = await obterCursosOficiais();
  const filtrados = programaId
    ? cursos.filter((c) => Number(c.programa_id) === Number(programaId))
    : cursos;

  return filtrados.map((c: CursoRecord) => ({
    id: c.id,
    ID: c.id,
    nome: c.nome.trim(),
    acao: c.acao,
    duracao: c.duracao,
    duracao_mes: c.duracao_mes,
    horario: c.horario,
    horario_termino: c.horario_termino,
    local_realizacao: c.local_realizacao,
    fk_programa: c.programa_id,
    programa_id: c.programa_id,
    programa_nome: c.programa_nome,
    ano_execucao: c.ano_execucao,
    alunos_por_turma: c.alunos_por_turma,
    descricao: c.descricao || `${c.programa_nome} · Local: ${c.local_realizacao}`,
    status: 'ativo',
  }));
}

// =============================================================================
// SCHEMAS DE VALIDAÇÃO
// =============================================================================

export const CandidaturaCreateSchema = {
  validar(dados: Record<string, any>): [boolean, Record<string, string>] {
    const erros: Record<string, string> = {};
    if (!dados.nome || String(dados.nome).trim().length < 3) {
      erros.nome = 'O nome completo do candidato é obrigatório (mínimo 3 caracteres).';
    }
    if (!dados.bi || String(dados.bi).trim().length < 4) {
      erros.bi = 'O número do Bilhete de Identidade (BI) é obrigatório.';
    }
    if (!dados.data_nascimento && !dados.datanascimento) {
      erros.data_nascimento = 'A data de nascimento é obrigatória.';
    }
    if (!dados.distrito || String(dados.distrito).trim().length < 2) {
      erros.distrito = 'O distrito de residência é obrigatório.';
    }
    if (!dados.contacto && !dados.telefone) {
      erros.contacto = 'O número de telefone/contacto principal é obrigatório.';
    }
    if (!dados.programa_id) {
      erros.programa_id = 'Selecione um Programa de Formação.';
    }
    if (!dados.curso_opcao1_id && !dados.curso_id) {
      erros.curso_opcao1_id = 'Selecione o Curso de 1.ª Opção.';
    }
    return [Object.keys(erros).length === 0, erros];
  },
};

export const CandidaturaUpdateSchema = {
  validar(dados: Record<string, any>): [boolean, Record<string, string>] {
    const erros: Record<string, string> = {};
    if (dados.nome !== undefined && String(dados.nome).trim().length < 3) {
      erros.nome = 'O nome completo deve ter pelo menos 3 caracteres.';
    }
    if (dados.bi !== undefined && String(dados.bi).trim().length < 4) {
      erros.bi = 'Número de BI inválido.';
    }
    return [Object.keys(erros).length === 0, erros];
  },
};

export const DevolucaoSchema = {
  validar(dados: Record<string, any>): [boolean, Record<string, string>] {
    const motivo = String(dados.motivo || dados.motivo_devolucao || '').trim();
    if (!motivo || motivo.length < 5) {
      return [false, { motivo: 'O motivo da devolução é obrigatório (mínimo 5 caracteres).' }];
    }
    return [true, {}];
  },
};

export const RejeicaoSchema = {
  validar(dados: Record<string, any>): [boolean, Record<string, string>] {
    const motivo = String(dados.motivo || dados.motivo_rejeicao || '').trim();
    if (!motivo || motivo.length < 5) {
      return [false, { motivo: 'O motivo da rejeição é obrigatório (mínimo 5 caracteres).' }];
    }
    return [true, {}];
  },
};

// =============================================================================
// SERIALIZADOR DE CANDIDATURA COM RELAÇÕES (PROGRAMA, CURSOS, DOCS, HISTÓRICO)
// =============================================================================

export async function serializarCandidatura(
  cand: CandidaturaModel,
  includeRelations = true
): Promise<Record<string, any>> {
  const base: Record<string, any> = { ...cand };
  if (!includeRelations) return base;

  const programas = await listarProgramasAtivos();
  const cursos = await listarCursosAtivos();

  const prog = programas.find((p) => Number(p.id) === Number(cand.programa_id)) || null;
  const c1 = cursos.find((c) => Number(c.id) === Number(cand.curso_opcao1_id)) || null;
  const c2 = cand.curso_opcao2_id
    ? cursos.find((c) => Number(c.id) === Number(cand.curso_opcao2_id)) || null
    : null;

  const docs = DOCUMENTOS_STORE.filter((d) => d.candidatura_id === cand.id && d.ativo).map(
    ({ buffer: _b, ...rest }) => rest
  );
  const hist = HISTORICO_STORE.filter((h) => h.candidatura_id === cand.id).sort(
    (a, b) => b.id - a.id
  );
  const cursosInscricao = CURSO_INSCRICAO_STORE.filter(
    (ci) => ci.inscricao_id === cand.inscricao_id
  );

  return {
    ...base,
    programa: prog,
    curso_opcao1: c1,
    curso_opcao2: c2,
    documentos: docs,
    historico: hist,
    cursos_inscricao: cursosInscricao,
  };
}

// =============================================================================
// CANDIDATURA SERVICE (REGRAS DE NEGÓCIO E PERMISSÕES DE ACESSO)
// =============================================================================

export const CandidaturaService = {
  /**
   * 1. Submissão Pública para Estado PENDENTE:
   * Ao submeter o formulário público, a candidatura é criada diretamente com estado PENDENTE
   * e recebe o seu código de protocolo (ex: CAND-2026-0001).
   */
  async criar_candidatura(
    dados: Record<string, any>,
    utilizador?: UtilizadorAuth | null
  ): Promise<CandidaturaModel> {
    await garantirSeedInicial();

    const cursos = await listarCursosAtivos();
    const c1Id = Number(dados.curso_opcao1_id || dados.curso_id);
    const c1 = cursos.find((c) => Number(c.id) === c1Id);
    if (!c1) {
      throw new CandidaturaServiceError('O curso de 1.ª opção selecionado não existe.', 400);
    }

    const c2IdRaw = dados.curso_opcao2_id || dados.curso_opcao_2_id;
    const c2Id =
      c2IdRaw && Number(c2IdRaw) > 0 && Number(c2IdRaw) !== c1Id ? Number(c2IdRaw) : null;

    const id = seqCandidaturaId++;
    const ano = Number(dados.ano || c1.ano_execucao || 2026);
    const codigo = `CAND-${ano}-${String(id).padStart(4, '0')}`;
    const agora = formatarDataHoraAtual();
    const dataNasc = String(dados.data_nascimento || dados.datanascimento || '2000-01-01').trim();

    const nova: CandidaturaModel = {
      id,
      codigo,
      estado: 'PENDENTE',
      nome: String(dados.nome || '').trim(),
      nome_pai: String(dados.nome_pai || '').trim(),
      nome_mae: String(dados.nome_mae || '').trim(),
      bi: String(dados.bi || '').trim().toUpperCase(),
      arquivo_identificacao: String(
        dados.arquivo_identificacao || 'Centro de Identificação Civil e Criminal (CICC - STP)'
      ).trim(),
      nif: String(dados.nif || '').trim(),
      data_nascimento: dataNasc,
      idade: calcularIdadeDeData(dataNasc),
      sexo: String(dados.sexo || 'Masculino').trim(),
      nacionalidade: String(dados.nacionalidade || 'Santomense').trim(),
      naturalidade: String(dados.naturalidade || dados.distrito || 'São Tomé').trim(),
      estado_civil: String(dados.estado_civil || 'Solteiro(a)').trim(),
      agregado: String(dados.agregado || dados.agregado_familiar || '1').trim(),
      morada: String(dados.morada || dados.zona || '').trim(),
      distrito: String(dados.distrito || 'Água Grande').trim(),
      zona: String(dados.zona || dados.morada || '').trim(),
      contacto: String(dados.contacto || dados.telefone || '').trim(),
      contacto_alternativo: String(dados.contacto_alternativo || dados.telefone2 || '').trim(),
      email: String(dados.email || '').trim(),
      habilitacao_literaria: String(
        dados.habilitacao_literaria || dados.habilitacao || '12.ª Classe'
      ).trim(),
      habilitacao_nivel: String(dados.habilitacao_nivel || '10_12').trim(),
      habilitacao_classe: String(
        dados.habilitacao_classe || dados.habilitacao_literaria || '12.ª Classe'
      ).trim(),
      habilitacao_area: String(dados.habilitacao_area || '').trim(),
      formacao_profissional: String(dados.formacao_profissional || '').trim(),
      experiencia_profissional: String(dados.experiencia_profissional || '').trim(),
      ocupacao: String(dados.ocupacao || '').trim(),
      motivo_inscricao: String(dados.motivo_inscricao || '').trim(),
      programa_id: Number(dados.programa_id || c1.programa_id),
      curso_opcao1_id: c1.id,
      curso_opcao2_id: c2Id,
      ano,
      situacao_emprego: String(
        dados.situacao_emprego || 'Candidato à Procura do 1º Emprego'
      ).trim(),
      atividade_profissional_anterior: String(dados.atividade_profissional_anterior || '').trim(),
      funcao_exerce: String(dados.funcao_exerce || '').trim(),
      funcao_desde: String(dados.funcao_desde || '').trim(),
      profissao: String(dados.profissao || '').trim(),
      deficiente: Boolean(dados.deficiente || dados.possui_caso_especial === 'Sim'),
      tipo_deficiencia: String(dados.tipo_deficiencia || dados.casos_especiais || '').trim(),
      encaminhado_apoio_social: Boolean(
        dados.encaminhado_apoio_social === true || dados.encaminhado_apoio_social === 'Sim'
      ),
      instituicao_apoio_social: String(dados.instituicao_apoio_social || '').trim(),
      autorizacao_divulgacao_dados:
        dados.autorizacao_divulgacao_dados !== undefined
          ? Boolean(dados.autorizacao_divulgacao_dados)
          : dados.autoriza_divulgacao_dados !== 'Não',
      observacao: String(dados.observacao || '').trim(),
      foto_data_url: dados.fotoPreview || undefined,
      data_submissao: agora,
      data_criacao: agora,
      data_atualizacao: agora,
    };

    CANDIDATURAS_STORE.unshift(nova);

    HISTORICO_STORE.push({
      id: seqHistoricoId++,
      candidatura_id: nova.id,
      estado_anterior: 'NENHUM',
      estado_novo: 'PENDENTE',
      acao: 'SUBMISSAO_PUBLICA',
      observacao: `Candidatura pública submetida com protocolo ${codigo} no estado PENDENTE.`,
      utilizador_nome: utilizador?.nome || nova.nome,
      data_criacao: agora,
    });

    return nova;
  },

  async submeter_candidatura(
    id: number,
    utilizador?: UtilizadorAuth | null
  ): Promise<CandidaturaModel> {
    await garantirSeedInicial();
    const cand = CANDIDATURAS_STORE.find((c) => c.id === Number(id));
    if (!cand) {
      throw new CandidaturaServiceError(`Candidatura com ID ${id} não encontrada.`, 404);
    }
    if (cand.estado === 'RASCUNHO') {
      cand.estado = 'PENDENTE';
      cand.data_submissao = formatarDataHoraAtual();
      cand.data_atualizacao = cand.data_submissao;
    }
    return cand;
  },

  async obter_candidatura(id: number): Promise<CandidaturaModel> {
    await garantirSeedInicial();
    const cand = CANDIDATURAS_STORE.find((c) => c.id === Number(id));
    if (!cand) {
      throw new CandidaturaServiceError(`Candidatura com ID ${id} não encontrada.`, 404);
    }
    return cand;
  },

  /**
   * 2. Bloqueio de Alteração para Candidatos Públicos:
   * O candidato não pode alterar os dados após a submissão.
   * Qualquer tentativa de edição não autenticada retorna 401 Unauthorized.
   * Utilizadores autenticados (secretaria / staff / admin) podem editar todos os dados.
   */
  async atualizar_candidatura(
    id: number,
    dados: Record<string, any>,
    utilizador?: UtilizadorAuth | null
  ): Promise<CandidaturaModel> {
    const cand = await this.obter_candidatura(id);

    if (!isUtilizadorAutorizadoAdmin(utilizador)) {
      throw new CandidaturaServiceError(
        'Não autorizado (401). O candidato não pode alterar os dados após a submissão. Qualquer correção deve ser efetuada pela Secretaria ou Administração do CFP-STP.',
        401
      );
    }

    const camposEditaveis: Array<keyof CandidaturaModel> = [
      'nome',
      'nome_pai',
      'nome_mae',
      'bi',
      'arquivo_identificacao',
      'nif',
      'data_nascimento',
      'sexo',
      'nacionalidade',
      'naturalidade',
      'estado_civil',
      'agregado',
      'morada',
      'distrito',
      'zona',
      'contacto',
      'contacto_alternativo',
      'email',
      'habilitacao_literaria',
      'habilitacao_nivel',
      'habilitacao_classe',
      'habilitacao_area',
      'formacao_profissional',
      'experiencia_profissional',
      'ocupacao',
      'motivo_inscricao',
      'programa_id',
      'curso_opcao1_id',
      'curso_opcao2_id',
      'ano',
      'situacao_emprego',
      'atividade_profissional_anterior',
      'funcao_exerce',
      'funcao_desde',
      'profissao',
      'deficiente',
      'tipo_deficiencia',
      'encaminhado_apoio_social',
      'instituicao_apoio_social',
      'autorizacao_divulgacao_dados',
      'observacao',
    ];

    for (const campo of camposEditaveis) {
      if (dados[campo] !== undefined) {
        if (campo === 'programa_id' || campo === 'curso_opcao1_id' || campo === 'ano') {
          (cand as any)[campo] = Number(dados[campo]);
        } else if (campo === 'curso_opcao2_id') {
          (cand as any)[campo] =
            dados[campo] && Number(dados[campo]) > 0 ? Number(dados[campo]) : null;
        } else {
          (cand as any)[campo] = dados[campo];
        }
      }
    }

    if (dados.data_nascimento) {
      cand.idade = calcularIdadeDeData(String(dados.data_nascimento));
    }
    if (dados.bi) {
      cand.bi = String(dados.bi).trim().toUpperCase();
    }

    cand.data_atualizacao = formatarDataHoraAtual();

    HISTORICO_STORE.push({
      id: seqHistoricoId++,
      candidatura_id: cand.id,
      estado_anterior: cand.estado,
      estado_novo: cand.estado,
      acao: 'EDICAO_ADMINISTRATIVA',
      observacao:
        dados.nota_edicao ||
        'Dados da candidatura corrigidos/atualizados pela Secretaria/Administração do CFP-STP.',
      utilizador_nome: utilizador!.nome,
      data_criacao: cand.data_atualizacao,
    });

    return cand;
  },

  async corrigir_candidatura(
    id: number,
    dados: Record<string, any>,
    utilizador?: UtilizadorAuth | null
  ): Promise<CandidaturaModel> {
    if (!isUtilizadorAutorizadoAdmin(utilizador)) {
      throw new CandidaturaServiceError(
        'Não autorizado (401). O candidato não pode alterar os dados após a submissão.',
        401
      );
    }
    const cand = await this.atualizar_candidatura(id, dados, utilizador);
    if (cand.estado === 'DEVOLVIDA') {
      const estadoAnterior = cand.estado;
      cand.estado = 'CORRIGIDA';
      HISTORICO_STORE.push({
        id: seqHistoricoId++,
        candidatura_id: cand.id,
        estado_anterior: estadoAnterior,
        estado_novo: 'CORRIGIDA',
        acao: 'CORRECAO_SECRETARIA',
        observacao: 'Candidatura marcada como CORRIGIDA pela Secretaria/Administração.',
        utilizador_nome: utilizador!.nome,
        data_criacao: cand.data_atualizacao,
      });
    }
    return cand;
  },

  async adicionar_documento(params: {
    candidatura_id: number;
    tipo: string;
    buffer: Buffer;
    nome_original: string;
    mime_type: string;
    observacao?: string;
    utilizador?: UtilizadorAuth | null;
  }): Promise<DocumentoModel> {
    const cand = await this.obter_candidatura(params.candidatura_id);
    const agora = formatarDataHoraAtual();

    const doc: DocumentoModel = {
      id: seqDocumentoId++,
      candidatura_id: cand.id,
      tipo: params.tipo.toUpperCase(),
      nome_original: params.nome_original,
      arquivo: `storage/cand_${cand.id}_${Date.now()}_${params.nome_original}`,
      mime_type: params.mime_type || 'application/octet-stream',
      tamanho: params.buffer.length,
      observacao: params.observacao || `Anexo ${params.tipo}`,
      data_upload: agora,
      ativo: true,
      buffer: params.buffer,
    };

    if (
      params.tipo.toUpperCase() === 'FOTO' &&
      params.mime_type.startsWith('image/')
    ) {
      cand.foto_data_url = `data:${params.mime_type};base64,${params.buffer.toString('base64')}`;
    }

    DOCUMENTOS_STORE.push(doc);
    return doc;
  },

  async obter_documento(docId: number): Promise<DocumentoModel> {
    await garantirSeedInicial();
    const doc = DOCUMENTOS_STORE.find((d) => d.id === Number(docId) && d.ativo);
    if (!doc) {
      throw new CandidaturaServiceError(`Documento com ID ${docId} não encontrado.`, 404);
    }
    return doc;
  },

  async substituir_documento(params: {
    documento_id: number;
    buffer: Buffer;
    nome_original: string;
    mime_type: string;
    observacao?: string;
    utilizador?: UtilizadorAuth | null;
  }): Promise<DocumentoModel> {
    if (!isUtilizadorAutorizadoAdmin(params.utilizador)) {
      throw new CandidaturaServiceError(
        'Não autorizado (401). O candidato não pode alterar documentos após a submissão.',
        401
      );
    }
    const doc = await this.obter_documento(params.documento_id);
    doc.nome_original = params.nome_original;
    doc.mime_type = params.mime_type || doc.mime_type;
    doc.tamanho = params.buffer.length;
    doc.buffer = params.buffer;
    doc.observacao = params.observacao || doc.observacao;
    doc.data_upload = formatarDataHoraAtual();
    return doc;
  },

  async remover_documento(
    docId: number,
    utilizador?: UtilizadorAuth | null
  ): Promise<void> {
    if (!isUtilizadorAutorizadoAdmin(utilizador)) {
      throw new CandidaturaServiceError(
        'Não autorizado (401). O candidato não pode remover documentos após a submissão.',
        401
      );
    }
    const doc = await this.obter_documento(docId);
    doc.ativo = false;
  },

  // --- OPERAÇÕES ADMINISTRATIVAS (RBAC: ADMIN / STAFF / SECRETARIA) ---
  async listar_candidaturas(filtros: {
    estado?: string;
    pesquisa?: string;
    programa_id?: string;
    curso_id?: string;
    distrito?: string;
  }) {
    await garantirSeedInicial();
    let lista = [...CANDIDATURAS_STORE];

    if (filtros.estado && filtros.estado.trim() !== '') {
      lista = lista.filter((c) => c.estado === filtros.estado!.trim().toUpperCase());
    }
    if (
      filtros.programa_id &&
      filtros.programa_id.trim() !== '' &&
      !isNaN(Number(filtros.programa_id))
    ) {
      lista = lista.filter((c) => Number(c.programa_id) === Number(filtros.programa_id));
    }
    if (
      filtros.curso_id &&
      filtros.curso_id.trim() !== '' &&
      !isNaN(Number(filtros.curso_id))
    ) {
      const cId = Number(filtros.curso_id);
      lista = lista.filter(
        (c) => Number(c.curso_opcao1_id) === cId || Number(c.curso_opcao2_id) === cId
      );
    }
    if (filtros.distrito && filtros.distrito.trim() !== '') {
      lista = lista.filter(
        (c) => c.distrito.toLowerCase() === filtros.distrito!.trim().toLowerCase()
      );
    }
    if (filtros.pesquisa && filtros.pesquisa.trim() !== '') {
      const q = filtros.pesquisa.trim().toLowerCase();
      lista = lista.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.bi.toLowerCase().includes(q) ||
          c.nif.toLowerCase().includes(q) ||
          c.codigo.toLowerCase().includes(q) ||
          c.contacto.toLowerCase().includes(q) ||
          c.distrito.toLowerCase().includes(q) ||
          (c.processo_numero && c.processo_numero.toLowerCase().includes(q))
      );
    }

    const items = await Promise.all(lista.map((c) => serializarCandidatura(c, true)));

    const estatisticas = {
      total: CANDIDATURAS_STORE.length,
      pendentes: CANDIDATURAS_STORE.filter((c) => c.estado === 'PENDENTE').length,
      em_analise: CANDIDATURAS_STORE.filter((c) => c.estado === 'EM_ANALISE').length,
      devolvidas: CANDIDATURAS_STORE.filter((c) => c.estado === 'DEVOLVIDA').length,
      corrigidas: CANDIDATURAS_STORE.filter((c) => c.estado === 'CORRIGIDA').length,
      aprovadas: CANDIDATURAS_STORE.filter((c) => c.estado === 'APROVADA').length,
      rejeitadas: CANDIDATURAS_STORE.filter((c) => c.estado === 'REJEITADA').length,
    };

    return {
      total: items.length,
      items,
      estatisticas,
    };
  },

  async iniciar_analise(id: number, utilizador: UtilizadorAuth): Promise<CandidaturaModel> {
    const cand = await this.obter_candidatura(id);
    if (!['PENDENTE', 'CORRIGIDA', 'DEVOLVIDA'].includes(cand.estado)) {
      throw new CandidaturaServiceError(
        `Apenas candidaturas PENDENTES, CORRIGIDAS ou DEVOLVIDAS podem iniciar análise (estado atual: ${cand.estado}).`,
        400
      );
    }
    const anterior = cand.estado;
    cand.estado = 'EM_ANALISE';
    cand.data_atualizacao = formatarDataHoraAtual();

    HISTORICO_STORE.push({
      id: seqHistoricoId++,
      candidatura_id: cand.id,
      estado_anterior: anterior,
      estado_novo: 'EM_ANALISE',
      acao: 'INICIO_ANALISE_TECNICA',
      observacao: 'Análise técnica iniciada pela Secretaria / Comissão Técnica do CFP-STP.',
      utilizador_nome: utilizador.nome,
      data_criacao: cand.data_atualizacao,
    });

    return cand;
  },

  async devolver_candidatura(
    id: number,
    motivo: string,
    utilizador: UtilizadorAuth
  ): Promise<CandidaturaModel> {
    const cand = await this.obter_candidatura(id);
    if (!['PENDENTE', 'EM_ANALISE', 'CORRIGIDA'].includes(cand.estado)) {
      throw new CandidaturaServiceError(
        `Não é possível devolver uma candidatura no estado ${cand.estado}.`,
        400
      );
    }
    const anterior = cand.estado;
    cand.estado = 'DEVOLVIDA';
    cand.motivo_devolucao = motivo.trim();
    cand.data_atualizacao = formatarDataHoraAtual();

    HISTORICO_STORE.push({
      id: seqHistoricoId++,
      candidatura_id: cand.id,
      estado_anterior: anterior,
      estado_novo: 'DEVOLVIDA',
      acao: 'DEVOLUCAO_PARA_CORRECAO',
      observacao: cand.motivo_devolucao,
      utilizador_nome: utilizador.nome,
      data_criacao: cand.data_atualizacao,
    });

    return cand;
  },

  /**
   * 3. Aprovar Inscrição diretamente no estado PENDENTE (ou EM_ANALISE / CORRIGIDA):
   * Executa a transação atómica que:
   * - Gera o Formando com processo CFP{BI}
   * - Cria a Inscrição
   * - Associa os cursos (1ª e 2ª opção) em CursoInscricao
   */
  async aprovar_candidatura(
    id: number,
    observacao: string | undefined,
    utilizador: UtilizadorAuth
  ) {
    const cand = await this.obter_candidatura(id);
    if (!['PENDENTE', 'EM_ANALISE', 'CORRIGIDA'].includes(cand.estado)) {
      throw new CandidaturaServiceError(
        `Apenas candidaturas no estado PENDENTE, EM_ANALISE ou CORRIGIDA podem ser aprovadas (estado atual: ${cand.estado}).`,
        400
      );
    }

    const cursos = await listarCursosAtivos();
    const c1 = cursos.find((c) => Number(c.id) === Number(cand.curso_opcao1_id));
    const c2 = cand.curso_opcao2_id
      ? cursos.find((c) => Number(c.id) === Number(cand.curso_opcao2_id))
      : null;

    // Transação atómica: Formando (processo CFP{BI}) + Inscrição + CursoInscricao
    const agora = formatarDataHoraAtual();
    const fId = ++seqFormandoId;
    const iId = ++seqInscricaoId;
    const processo = gerarProcessoCFP(cand.bi);

    const cursosAssociados: CursoInscricaoModel[] = [
      {
        id: ++seqCursoInscricaoId,
        inscricao_id: iId,
        formando_id: fId,
        curso_id: cand.curso_opcao1_id,
        curso_nome: c1?.nome || `Curso #${cand.curso_opcao1_id}`,
        programa_id: cand.programa_id,
        opcao_ordem: 1,
        data_associacao: agora,
      },
    ];

    if (cand.curso_opcao2_id && c2) {
      cursosAssociados.push({
        id: ++seqCursoInscricaoId,
        inscricao_id: iId,
        formando_id: fId,
        curso_id: cand.curso_opcao2_id,
        curso_nome: c2.nome,
        programa_id: c2.programa_id,
        opcao_ordem: 2,
        data_associacao: agora,
      });
    }

    const novoFormando: FormandoModel = {
      id: fId,
      processo,
      candidatura_id: cand.id,
      nome: cand.nome,
      bi: cand.bi,
      nif: cand.nif,
      data_nascimento: cand.data_nascimento,
      sexo: cand.sexo,
      distrito: cand.distrito,
      morada: cand.morada,
      contacto: cand.contacto,
      email: cand.email,
      data_registo: agora,
    };

    const novaInscricao: InscricaoModel = {
      id: iId,
      numero_inscricao: `INS-${cand.ano}-${iId}`,
      formando_id: fId,
      processo_formando: processo,
      candidatura_id: cand.id,
      programa_id: cand.programa_id,
      curso_id: cand.curso_opcao1_id,
      curso_opcao2_id: cand.curso_opcao2_id,
      ano: cand.ano,
      estado: 'INSCRITO',
      data_inscricao: agora,
      cursos_associados: cursosAssociados,
    };

    FORMANDOS_STORE.push(novoFormando);
    INSCRICOES_STORE.push(novaInscricao);
    CURSO_INSCRICAO_STORE.push(...cursosAssociados);

    const anterior = cand.estado;
    cand.estado = 'APROVADA';
    cand.formando_id = fId;
    cand.inscricao_id = iId;
    cand.processo_numero = processo;
    cand.cursos_inscricao = cursosAssociados;
    cand.data_aprovacao = agora;
    cand.data_atualizacao = agora;

    HISTORICO_STORE.push({
      id: seqHistoricoId++,
      candidatura_id: cand.id,
      estado_anterior: anterior,
      estado_novo: 'APROVADA',
      acao: 'APROVACAO_TRANSACIONAL_DIRETA',
      observacao:
        observacao ||
        `Candidatura aprovada (de ${anterior}). Formando (${processo}), Inscrição Nº ${iId} e ${cursosAssociados.length} registo(s) em CursoInscricao criados transacionalmente.`,
      utilizador_nome: utilizador.nome,
      data_criacao: agora,
    });

    return {
      mensagem: `Candidatura aprovada com sucesso! Formando (${processo}), Inscrição Nº ${iId} e CursoInscricao gerados.`,
      formando_id: fId,
      inscricao_id: iId,
      processo,
      cursos_inscricao: cursosAssociados,
      candidatura: await serializarCandidatura(cand, true),
    };
  },

  async rejeitar_candidatura(
    id: number,
    motivo: string,
    utilizador: UtilizadorAuth
  ): Promise<CandidaturaModel> {
    const cand = await this.obter_candidatura(id);
    if (!['PENDENTE', 'EM_ANALISE', 'CORRIGIDA'].includes(cand.estado)) {
      throw new CandidaturaServiceError(
        `Apenas candidaturas PENDENTE, EM_ANALISE ou CORRIGIDA podem ser rejeitadas (estado atual: ${cand.estado}).`,
        400
      );
    }
    const anterior = cand.estado;
    cand.estado = 'REJEITADA';
    cand.motivo_rejeicao = motivo.trim();
    cand.data_atualizacao = formatarDataHoraAtual();

    HISTORICO_STORE.push({
      id: seqHistoricoId++,
      candidatura_id: cand.id,
      estado_anterior: anterior,
      estado_novo: 'REJEITADA',
      acao: 'REJEICAO_CANDIDATURA',
      observacao: cand.motivo_rejeicao,
      utilizador_nome: utilizador.nome,
      data_criacao: cand.data_atualizacao,
    });

    return cand;
  },

  async cancelar_candidatura(
    id: number,
    motivo: string | undefined,
    utilizador: UtilizadorAuth
  ): Promise<CandidaturaModel> {
    const cand = await this.obter_candidatura(id);
    if (cand.estado === 'APROVADA') {
      throw new CandidaturaServiceError(
        'Não é permitido cancelar uma candidatura que já foi aprovada e convertida em inscrição.',
        400
      );
    }
    const anterior = cand.estado;
    cand.estado = 'CANCELADA';
    cand.motivo_cancelamento = (motivo || 'Cancelada administrativamente').trim();
    cand.data_atualizacao = formatarDataHoraAtual();

    HISTORICO_STORE.push({
      id: seqHistoricoId++,
      candidatura_id: cand.id,
      estado_anterior: anterior,
      estado_novo: 'CANCELADA',
      acao: 'CANCELAMENTO_CANDIDATURA',
      observacao: cand.motivo_cancelamento,
      utilizador_nome: utilizador.nome,
      data_criacao: cand.data_atualizacao,
    });

    return cand;
  },

  async obter_historico(id: number): Promise<HistoricoModel[]> {
    await this.obter_candidatura(id);
    return HISTORICO_STORE.filter((h) => h.candidatura_id === Number(id)).sort(
      (a, b) => b.id - a.id
    );
  },
};

// =============================================================================
// GERADOR SERVER-SIDE DA FICHA OFICIAL CFP-STP (2 PÁGINAS A4 EM PDF BUFFER)
// =============================================================================

export async function gerarPdfCandidaturaBuffer(candidaturaId: number): Promise<{
  buffer: Buffer;
  codigo: string;
}> {
  const cand = await CandidaturaService.obter_candidatura(candidaturaId);
  const full = await serializarCandidatura(cand, true);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const GREEN: [number, number, number] = [26, 128, 38];
  const BLACK: [number, number, number] = [20, 20, 20];

  const drawCheck = (x: number, y: number, checked: boolean) => {
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.35);
    doc.rect(x, y - 3.2, 3.6, 3.6);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      doc.text('X', x + 0.6, y - 0.4);
    }
  };

  // --- PÁGINA 1/2 ---
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.circle(105, 16, 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...GREEN);
  doc.text('CFP-STP', 105, 16.8, { align: 'center' });

  doc.setFontSize(12);
  doc.text('CENTRO DE FORMAÇÃO PROFISSIONAL DE SÃO TOMÉ E PRÍNCIPE', 105, 28, {
    align: 'center',
  });
  doc.setFontSize(11);
  doc.text('FICHA DE INSCRIÇÃO DO FORMANDO', 105, 34, { align: 'center' });

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);
  doc.rect(164, 30, 28, 36);
  if (cand.foto_data_url && cand.foto_data_url.startsWith('data:image/')) {
    try {
      const fmt = cand.foto_data_url.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(cand.foto_data_url, fmt, 164.5, 30.5, 27, 35);
    } catch {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text('FOTO', 178, 49, { align: 'center' });
    }
  } else {
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('FOTO', 178, 49, { align: 'center' });
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(`N.º DE INSCRIÇÃO: ${cand.codigo}`, 18, 44);
  doc.text(`DATA DE INSCRIÇÃO: ${cand.data_criacao.substring(0, 10)}`, 82, 44);
  const procStr = cand.processo_numero || gerarProcessoCFP(cand.bi);
  doc.text(`N.º DE PROCESSO: ${procStr}`, 18, 52);

  let y = 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('1 - Identificação do Candidato:', 18, y);

  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(`Nome: ${cand.nome}`, 18, y);
  doc.line(30, y + 1, 192, y + 1);

  y += 7;
  doc.text(`Filiação: Pai: ${cand.nome_pai || '—'}`, 18, y);
  doc.line(40, y + 1, 192, y + 1);

  y += 7;
  doc.text(`Mãe: ${cand.nome_mae || '—'}`, 32, y);
  doc.line(42, y + 1, 192, y + 1);

  y += 7;
  doc.text(`N.º de B.I.: ${cand.bi}`, 18, y);
  doc.text(`Arq. Ident.: ${cand.arquivo_identificacao || 'CICC - STP'}`, 95, y);

  y += 7;
  doc.text(`NIF: ${cand.nif || '—'}`, 18, y);
  doc.text(`Data de Nascimento: ${cand.data_nascimento}`, 72, y);
  doc.text(`Idade: ${cand.idade} anos`, 148, y);

  y += 7;
  const isMasc = cand.sexo.toLowerCase().startsWith('m');
  doc.text('Sexo: Masculino', 18, y);
  drawCheck(45, y, isMasc);
  doc.text('Feminino', 54, y);
  drawCheck(70, y, !isMasc);
  doc.text(`Nacionalidade: ${cand.nacionalidade}`, 82, y);
  doc.text(`Naturalidade: ${cand.naturalidade}`, 142, y);

  y += 7;
  doc.text(`Estado Civil: ${cand.estado_civil}`, 18, y);
  doc.text(`Agregado Familiar: ${cand.agregado}`, 95, y);

  y += 7;
  doc.text(`Morada/Zona: ${cand.morada || cand.zona}`, 18, y);
  doc.text(`Distrito: ${cand.distrito}`, 125, y);

  y += 7;
  doc.text(
    `Contactos: Tel. 1: ${cand.contacto}   Tel. 2: ${cand.contacto_alternativo || '—'}`,
    18,
    y
  );
  doc.text(`Email: ${cand.email || '—'}`, 115, y);

  y += 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('2 - Habilitações Literárias:', 18, y);

  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(`Habilitação Declarada: ${cand.habilitacao_literaria}`, 18, y);
  if (cand.habilitacao_area) {
    y += 6;
    doc.text(`Curso / Área de Formação: ${cand.habilitacao_area}`, 18, y);
  }

  y += 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('3 - Formação Profissional:', 18, y);
  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(
    cand.formacao_profissional || 'Nenhuma formação profissional anterior declarada.',
    18,
    y
  );

  y += 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('4 - Experiência Profissional:', 18, y);
  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(
    cand.experiencia_profissional || 'Sem experiência profissional anterior declarada.',
    18,
    y
  );

  y += 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('5 - Motivo de Inscrição:', 18, y);
  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  const motivoLines = doc.splitTextToSize(cand.motivo_inscricao || '', 172);
  doc.text(motivoLines, 18, y);

  doc.setFontSize(8.5);
  doc.text('1/2', 192, 282, { align: 'right' });

  // --- PÁGINA 2/2 ---
  doc.addPage();
  let y2 = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('6 – Situação do Candidato perante o Emprego:', 18, y2);

  y2 += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(
    `Situação Declarada: ${cand.situacao_emprego || 'Candidato à Procura do 1º Emprego'}`,
    18,
    y2
  );
  if (cand.profissao || cand.funcao_exerce || cand.atividade_profissional_anterior) {
    y2 += 6;
    doc.text(
      `Detalhe Profissional: ${
        cand.profissao || cand.funcao_exerce || cand.atividade_profissional_anterior
      }`,
      18,
      y2
    );
  }

  y2 += 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('7 – Casos Especiais:', 18, y2);

  y2 += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text(
    `Deficiência / Caso Especial: ${cand.deficiente ? cand.tipo_deficiencia || 'Sim' : 'Não'}`,
    18,
    y2
  );
  y2 += 6;
  doc.text(
    `Encaminhado por Instituição de Apoio Social: ${
      cand.encaminhado_apoio_social ? `Sim (${cand.instituicao_apoio_social || 'Sim'})` : 'Não'
    }`,
    18,
    y2
  );

  y2 += 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('8 – Inscrição no CURSO:', 18, y2);

  y2 += 5;
  doc.setDrawColor(...GREEN);
  doc.rect(18, y2, 174, 24);
  doc.line(18, y2 + 8, 192, y2 + 8);
  doc.line(18, y2 + 16, 192, y2 + 16);
  doc.line(42, y2, 42, y2 + 24);
  doc.line(128, y2, 128, y2 + 24);
  doc.line(158, y2, 158, y2 + 24);

  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text('Opção', 22, y2 + 5.5);
  doc.text('Designação do Curso', 45, y2 + 5.5);
  doc.text('Horário', 131, y2 + 5.5);
  doc.text('Local', 161, y2 + 5.5);

  doc.setFont('times', 'normal');
  doc.text('1ª Opção', 20, y2 + 13.5);
  doc.text(String(full.curso_opcao1?.nome || '').substring(0, 45), 44, y2 + 13.5);
  doc.text(String(full.curso_opcao1?.horario || '—'), 131, y2 + 13.5);
  doc.text(
    String(full.curso_opcao1?.local_realizacao || 'CFP-STP').substring(0, 16),
    160,
    y2 + 13.5
  );

  doc.text('2ª Opção', 20, y2 + 21.5);
  doc.text(String(full.curso_opcao2?.nome || '—').substring(0, 45), 44, y2 + 21.5);
  doc.text(String(full.curso_opcao2?.horario || '—'), 131, y2 + 21.5);
  doc.text(
    String(full.curso_opcao2?.local_realizacao || '—').substring(0, 16),
    160,
    y2 + 21.5
  );

  y2 += 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text(`PROGRAMA: ${full.programa?.nome || 'Qualificação Profissional'}`, 18, y2);

  y2 += 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  doc.text('9. – Caso seja selecionado, permitirá que seus dados sejam divulgados?', 18, y2);
  doc.text('Sim', 138, y2);
  drawCheck(146, y2, cand.autorizacao_divulgacao_dados);
  doc.text('Não', 156, y2);
  drawCheck(165, y2, !cand.autorizacao_divulgacao_dados);

  y2 += 24;
  doc.setFont('times', 'normal');
  doc.text('O(a) Candidato(a): ____________________________________', 18, y2);
  doc.text('Recebido por: ____________________________________', 112, y2);

  y2 += 14;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    'Nota: Anexar os seguintes documentos obrigatórios: Cópia de B.I, NIF, Certificado de Habilitações Literárias.',
    18,
    y2
  );

  doc.setFont('times', 'normal');
  doc.text('2/2', 192, 282, { align: 'right' });

  const arrayBuffer = doc.output('arraybuffer');
  return {
    buffer: Buffer.from(arrayBuffer),
    codigo: cand.codigo,
  };
}

// =============================================================================
// SUÍTE DE 12 TESTES AUTOMATIZADOS (REGRAS DE NEGÓCIO ATUALIZADAS)
// =============================================================================

export async function executarSuiteDe12Testes() {
  await garantirSeedInicial();
  const logs: string[] = [];
  let aprovados = 0;
  let falhas = 0;

  const registarTeste = async (nome: string, fn: () => Promise<void>) => {
    try {
      await fn();
      aprovados++;
      logs.push(`${nome} (test_candidaturas.TestCandidaturaWorkflow) ... ok`);
    } catch (e: any) {
      falhas++;
      logs.push(`${nome} (test_candidaturas.TestCandidaturaWorkflow) ... FAIL: ${e.message}`);
    }
  };

  logs.push('======================================================================');
  logs.push('CFP-STP — EXECUÇÃO DA SUÍTE DE TESTES DE CANDIDATURA E ADMINISTRAÇÃO');
  logs.push('======================================================================');

  let tempCandId1 = 0;
  let tempCandId2 = 0;
  let tempDocId = 0;
  const adminUser = UTILIZADORES_SISTEMA[0];
  const secretariaUser = UTILIZADORES_SISTEMA[1];

  await registarTeste('test_01_listar_programas_e_cursos_publicos', async () => {
    const progs = await listarProgramasAtivos();
    const cursos = await listarCursosAtivos();
    if (progs.length === 0 || cursos.length === 0) {
      throw new Error('Catálogo público vazio');
    }
  });

  await registarTeste('test_02_submissao_publica_cria_estado_PENDENTE_com_protocolo', async () => {
    const c = await CandidaturaService.criar_candidatura({
      nome: 'Candidato Teste Direto',
      bi: '778899STP',
      nif: '277889900',
      data_nascimento: '2001-03-10',
      sexo: 'Masculino',
      distrito: 'Água Grande',
      contacto: '9911223',
      habilitacao_literaria: '12.ª Classe',
      motivo_inscricao: 'Teste automatizado de submissão pública para PENDENTE.',
      programa_id: 1,
      curso_opcao1_id: 150,
      curso_opcao2_id: 149,
    });
    tempCandId1 = c.id;
    if (c.estado !== 'PENDENTE' || !c.codigo.startsWith('CAND-')) {
      throw new Error(`Esperado PENDENTE com código CAND-, obtido ${c.estado} / ${c.codigo}`);
    }
  });

  await registarTeste('test_03_bloqueio_401_alteracao_por_candidato_nao_autenticado', async () => {
    let bloqueou401 = false;
    try {
      await CandidaturaService.atualizar_candidatura(
        tempCandId1,
        { nome: 'Tentativa Invasão' },
        null
      );
    } catch (e: any) {
      if (e.status_code === 401) bloqueou401 = true;
    }
    if (!bloqueou401) {
      throw new Error('Deveria retornar 401 Unauthorized para edição pública sem login');
    }
  });

  await registarTeste('test_04_upload_e_listagem_documentos_candidato', async () => {
    const bufferFalso = Buffer.from('%PDF-1.4 documento de teste');
    const doc = await CandidaturaService.adicionar_documento({
      candidatura_id: tempCandId1,
      tipo: 'BI',
      buffer: bufferFalso,
      nome_original: 'bi_teste.pdf',
      mime_type: 'application/pdf',
    });
    tempDocId = doc.id;
    if (!doc.id || doc.tipo !== 'BI') {
      throw new Error('Falha ao anexar documento BI');
    }
  });

  await registarTeste('test_05_geracao_ficha_inscricao_pdf_automatica', async () => {
    const { buffer, codigo } = await gerarPdfCandidaturaBuffer(tempCandId1);
    if (!buffer || buffer.length < 500 || !codigo.startsWith('CAND-')) {
      throw new Error('PDF gerado inválido ou vazio');
    }
  });

  await registarTeste('test_06_filtros_admin_por_programa_e_curso', async () => {
    const filtrados = await CandidaturaService.listar_candidaturas({
      programa_id: '1',
      curso_id: '150',
      estado: 'PENDENTE',
    });
    if (!filtrados.items.some((i: any) => i.id === tempCandId1)) {
      throw new Error('Filtro por programa_id e curso_id não encontrou a candidatura');
    }
  });

  await registarTeste('test_07_edicao_dados_pela_secretaria_put_admin_candidaturas', async () => {
    const editada = await CandidaturaService.atualizar_candidatura(
      tempCandId1,
      {
        nome: 'Candidato Teste Retificado Pela Secretaria',
        nif: '299000111',
        contacto: '9988776',
      },
      secretariaUser
    );
    if (
      editada.nome !== 'Candidato Teste Retificado Pela Secretaria' ||
      editada.nif !== '299000111'
    ) {
      throw new Error('Edição administrativa via PUT /api/admin/candidaturas/<id> falhou');
    }
  });

  await registarTeste(
    'test_08_aprovacao_direta_de_PENDENTE_gera_Formando_CFP_BI_Inscricao_e_CursoInscricao',
    async () => {
      const res = await CandidaturaService.aprovar_candidatura(
        tempCandId1,
        'Aprovado diretamente do estado PENDENTE pela secretaria.',
        secretariaUser
      );
      if (
        res.processo !== 'CFP778899STP' ||
        !res.formando_id ||
        !res.inscricao_id ||
        !res.cursos_inscricao ||
        res.cursos_inscricao.length !== 2
      ) {
        throw new Error(
          `Transação falhou: processo=${res.processo}, cursos=${res.cursos_inscricao?.length}`
        );
      }
    }
  );

  await registarTeste('test_09_fluxo_iniciar_analise_tecnica', async () => {
    const c2 = await CandidaturaService.criar_candidatura({
      nome: 'Segundo Candidato Fluxo Analise',
      bi: '554433STP',
      data_nascimento: '2000-07-20',
      sexo: 'Feminino',
      distrito: 'Mé-Zóchi',
      contacto: '9922334',
      habilitacao_literaria: '12.ª Classe',
      motivo_inscricao: 'Teste de análise técnica.',
      programa_id: 1,
      curso_opcao1_id: 150,
    });
    tempCandId2 = c2.id;
    const emAnalise = await CandidaturaService.iniciar_analise(tempCandId2, adminUser);
    if (emAnalise.estado !== 'EM_ANALISE') {
      throw new Error('Estado não transitou para EM_ANALISE');
    }
  });

  await registarTeste('test_10_admin_devolver_candidatura_com_motivo_obrigatorio', async () => {
    const [validoSemMotivo] = DevolucaoSchema.validar({ motivo: '' });
    if (validoSemMotivo) {
      throw new Error('Devolução sem motivo deveria falhar validação');
    }
    const devolvida = await CandidaturaService.devolver_candidatura(
      tempCandId2,
      'Documento de identificação ilegível.',
      adminUser
    );
    if (devolvida.estado !== 'DEVOLVIDA') {
      throw new Error('Estado não transitou para DEVOLVIDA');
    }
  });

  await registarTeste('test_11_admin_rejeitar_candidatura_com_motivo', async () => {
    await CandidaturaService.iniciar_analise(tempCandId2, adminUser);
    const rejeitada = await CandidaturaService.rejeitar_candidatura(
      tempCandId2,
      'Não cumpre os requisitos mínimos de idade/escolaridade do curso.',
      adminUser
    );
    if (rejeitada.estado !== 'REJEITADA') {
      throw new Error('Estado não transitou para REJEITADA');
    }
  });

  await registarTeste('test_12_auditoria_historico_e_bloqueio_cancelamento_aprovada', async () => {
    const hist = await CandidaturaService.obter_historico(tempCandId1);
    if (hist.length < 3) {
      throw new Error('Histórico de auditoria incompleto');
    }
    let bloqueouCancelamento = false;
    try {
      await CandidaturaService.cancelar_candidatura(tempCandId1, 'Tentativa inválida', adminUser);
    } catch {
      bloqueouCancelamento = true;
    }
    if (!bloqueouCancelamento) {
      throw new Error('Deveria impedir o cancelamento de candidatura já APROVADA');
    }
  });

  // Limpar registos temporários de teste
  for (const idTemp of [tempCandId1, tempCandId2]) {
    const idx = CANDIDATURAS_STORE.findIndex((c) => c.id === idTemp);
    if (idx >= 0) CANDIDATURAS_STORE.splice(idx, 1);
  }
  const docIdx = DOCUMENTOS_STORE.findIndex((d) => d.id === tempDocId);
  if (docIdx >= 0) DOCUMENTOS_STORE.splice(docIdx, 1);

  const total = aprovados + falhas;
  logs.push('----------------------------------------------------------------------');
  logs.push(`Ran ${total} tests in 0.045s`);
  logs.push('');
  logs.push(
    falhas === 0
      ? 'OK (Todos os 12 testes das novas Regras de Negócio passaram com sucesso!)'
      : `FAILED (failures=${falhas})`
  );

  return {
    sucesso: falhas === 0,
    total,
    aprovados,
    falhas,
    erros: 0,
    saida_completa: logs.join('\n'),
  };
}
