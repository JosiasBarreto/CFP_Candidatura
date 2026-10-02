export interface ProgramaPublico {
  id: number;
  ID?: number;
  nome: string;
  sigla?: string;
  descricao: string;
}

export interface CursoPublico {
  id: number;
  ID?: number;
  nome: string;
  acao: string;
  duracao: number;
  duracao_mes?: number;
  horario?: string;
  horario_termino?: string;
  local_realizacao?: string;
  fk_programa: number;
  programa_id?: number;
  programa_nome?: string;
  ano_execucao?: number;
  descricao: string;
}

export interface DocumentoAnexo {
  id: number;
  tipo: string;
  nome_original: string;
  arquivo: string;
  mime_type: string;
  tamanho: number;
  observacao?: string;
  data_upload: string;
}

export interface HistoricoEvento {
  id: number;
  estado_anterior?: string;
  estado_novo?: string;
  acao: string;
  observacao?: string;
  utilizador_nome?: string;
  data_criacao: string;
}

export interface CandidaturaPublica {
  id: number;
  codigo: string;
  estado: string;
  nome: string;
  nome_pai?: string;
  nome_mae?: string;
  bi: string;
  arquivo_identificacao?: string;
  nif?: string;
  data_nascimento: string;
  idade?: number;
  sexo: string;
  nacionalidade?: string;
  naturalidade?: string;
  estado_civil?: string;
  agregado?: string;
  morada?: string;
  distrito: string;
  zona?: string;
  contacto: string;
  contacto_alternativo?: string;
  email?: string;
  habilitacao_literaria: string;
  habilitacao_nivel?: string;
  habilitacao_classe?: string;
  habilitacao_area?: string;
  formacao_profissional?: string;
  experiencia_profissional?: string;
  ocupacao?: string;
  motivo_inscricao: string;
  programa_id: number;
  curso_opcao1_id: number;
  curso_opcao2_id?: number | null;
  ano: number;
  situacao_emprego?: string;
  atividade_profissional_anterior?: string;
  funcao_exerce?: string;
  funcao_desde?: string;
  profissao?: string;
  deficiente: boolean;
  tipo_deficiencia?: string;
  encaminhado_apoio_social: boolean;
  instituicao_apoio_social?: string;
  autorizacao_divulgacao_dados: boolean;
  observacao?: string;
  motivo_devolucao?: string;
  motivo_rejeicao?: string;
  formando_id?: number;
  inscricao_id?: number;
  processo_numero?: string;
  foto_data_url?: string;
  data_submissao?: string;
  data_aprovacao?: string;
  data_criacao: string;
  programa?: ProgramaPublico;
  curso_opcao1?: CursoPublico;
  curso_opcao2?: CursoPublico;
  documentos?: DocumentoAnexo[];
  historico?: HistoricoEvento[];
}
