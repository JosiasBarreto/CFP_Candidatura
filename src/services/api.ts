import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ProgramaPublico, CursoPublico, CandidaturaPublica } from '../packages/modulo-candidato/types';
import { converterCandidaturaParaDadosFicha } from '../packages/modulo-candidato/utils/candidaturaMapper';
import { gerarPdfFormularioInscricao } from '../utils/gerarPdfInscricao';
import { exportarInscricaoParaExcel } from '../utils/pdfFichaGenerator';

/**
 * Instância Centralizada do Axios para o CFP-STP
 * Configurada com a URL base da API (/api por padrão ou variável de ambiente)
 */
const BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

// Interceptor de Requisições: Injeta token JWT se existir no localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cfp_auth_token') : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respostas: Extrai mensagens de erro amigáveis
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const mensagemErro =
      error.response?.data?.erro ||
      error.response?.data?.mensagem ||
      error.message ||
      'Ocorreu um erro ao comunicar com o servidor do CFP-STP.';
    return Promise.reject(new Error(mensagemErro));
  }
);

// =============================================================================
// SERVIÇOS DE PROGRAMAS DE FORMAÇÃO
// =============================================================================
export const programasService = {
  /**
   * Obtém a lista de programas de formação ativos no CFP-STP
   */
  async listar(): Promise<ProgramaPublico[]> {
    try {
      const response = await apiClient.get<any>('/programas');
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.programas)) return data.programas;
      if (data && Array.isArray(data.data)) return data.data;
      if (data && Array.isArray(data.rows)) return data.rows;
      return [];
    } catch (e) {
      console.warn('[programasService] Erro ao carregar programas do servidor:', e);
      return [];
    }
  },
};

// =============================================================================
// SERVIÇOS DE CURSOS
// =============================================================================
export const cursosService = {
  /**
   * Lista todos os cursos disponíveis ou filtra por programa
   */
  async listar(programaId?: number): Promise<CursoPublico[]> {
    try {
      const params = programaId ? { programa_id: programaId } : {};
      const response = await apiClient.get<any>('/cursos', { params });
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.cursos)) return data.cursos;
      if (data && Array.isArray(data.data)) return data.data;
      if (data && Array.isArray(data.rows)) return data.rows;
      return [];
    } catch (e) {
      console.warn('[cursosService] Erro ao carregar cursos do servidor:', e);
      return [];
    }
  },

  /**
   * Busca cursos pelo endpoint direto de busca com filtro de ano
   */
  async buscarPorAno(ano?: number): Promise<CursoPublico[]> {
    try {
      const response = await apiClient.post<any>('/curso/busca', ano ? { ano_execucao: ano } : {});
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.cursos)) return data.cursos;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    } catch (e) {
      console.warn('[cursosService] Erro ao buscar cursos por ano:', e);
      return [];
    }
  },
};

// =============================================================================
// SERVIÇOS DE CANDIDATURAS (PORTAL DO CANDIDATO)
// =============================================================================
export interface RespostaSubmissaoCandidatura {
  mensagem: string;
  codigo: string;
  candidatura_id: number;
  estado: string;
  ficha_download_url: string;
  excel_download_url?: string;
  dados_inscricao?: any;
  candidatura: CandidaturaPublica;
}

export interface RespostaConsultaCandidatura {
  total: number;
  candidaturas: CandidaturaPublica[];
}

export const candidaturasService = {
  /**
   * Submete uma candidatura pública (com suporte a anexos multipart/form-data)
   */
  async submeter(formData: FormData): Promise<RespostaSubmissaoCandidatura> {
    const response = await apiClient.post<RespostaSubmissaoCandidatura>(
      '/candidaturas?submeter=true',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Consulta candidaturas pelo BI ou Código de Protocolo
   */
  async consultarPorBiOuCodigo(termo: string): Promise<CandidaturaPublica[]> {
    const limpo = termo.trim();
    const isCodigo = limpo.toUpperCase().startsWith('CAND-');
    const params = isCodigo ? { codigo: limpo } : { bi: limpo };

    const response = await apiClient.get<RespostaConsultaCandidatura>('/candidaturas/consultar', {
      params,
    });
    return response.data.candidaturas || [];
  },

  /**
   * Obtém os detalhes completos de uma candidatura por ID
   */
  async obterPorId(id: number): Promise<CandidaturaPublica> {
    const response = await apiClient.get<CandidaturaPublica>(`/candidaturas/${id}`);
    return response.data;
  },

  /**
   * Lista documentos anexados a uma candidatura
   */
  async listarDocumentos(id: number): Promise<{ total: number; documentos: any[] }> {
    const response = await apiClient.get(`/candidaturas/${id}/documentos`);
    return response.data;
  },

  /**
   * Gera e descarrega a Ficha Oficial em PDF (2 páginas A4) no navegador
   */
  baixarFichaPdfNavegador(cand: CandidaturaPublica): void {
    const dadosFicha = converterCandidaturaParaDadosFicha(cand);
    gerarPdfFormularioInscricao(dadosFicha);
  },

  /**
   * Gera e descarrega o ficheiro Excel (.xlsx) no navegador
   */
  exportarExcelNavegador(cand: CandidaturaPublica): void {
    const dadosFicha = converterCandidaturaParaDadosFicha(cand);
    exportarInscricaoParaExcel(dadosFicha);
  },

  /**
   * Retorna a URL direta do servidor para download do PDF oficial
   */
  obterUrlPdfServidor(id: number, download = true): string {
    return `${BASE_URL}/candidaturas/${id}/ficha-inscricao?download=${download}`;
  },

  /**
   * Retorna a URL direta do servidor para download do Excel
   */
  obterUrlExcelServidor(id: number): string {
    return `${BASE_URL}/candidaturas/${id}/excel`;
  },
};

// =============================================================================
// SERVIÇO DE NÍVEIS DE ACESSO (RBAC)
// =============================================================================
export interface NivelAcessoItem {
  id: number;
  nivel: 'ADMIN' | 'FUNCIONARIOS' | 'MASTER';
  datacriacao: string;
  dataatualizacao: string | null;
}

export interface TabelaNivelAcesso {
  table: string;
  rows: NivelAcessoItem[];
}

export const niveisAcessoService = {
  /**
   * Retorna a tabela oficial de níveis de acesso do sistema
   */
  async listar(): Promise<TabelaNivelAcesso> {
    const response = await apiClient.get<TabelaNivelAcesso>('/nivel-acesso');
    return response.data;
  },
};

// =============================================================================
// SERVIÇOS DE AUTENTICAÇÃO E ADMINISTRAÇÃO
// =============================================================================
export const authService = {
  /**
   * Autenticação de utilizadores com credenciais RBAC
   */
  async login(identificador: string, password: string): Promise<{ token: string; utilizador: any }> {
    const response = await apiClient.post('/auth/login', {
      identificador,
      password,
    });
    const { token } = response.data;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('cfp_auth_token', token);
    }
    return response.data;
  },

  /**
   * Limpa a sessão
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cfp_auth_token');
    }
  },

  /**
   * Obtém o token atual em memória/armazenamento
   */
  obterToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('cfp_auth_token') : null;
  },
};

export const adminService = {
  /**
   * Aprovação de candidatura pela Secretaria / Administração
   */
  async aprovar(id: number, observacao?: string): Promise<any> {
    const response = await apiClient.post(`/admin/candidaturas/${id}/aprovar`, { observacao });
    return response.data;
  },

  /**
   * Inicia a análise técnica da candidatura
   */
  async iniciarAnalise(id: number): Promise<any> {
    const response = await apiClient.post(`/admin/candidaturas/${id}/iniciar-analise`);
    return response.data;
  },

  /**
   * Devolve a candidatura com motivo obrigatório para correção
   */
  async devolver(id: number, motivo: string): Promise<any> {
    const response = await apiClient.post(`/admin/candidaturas/${id}/devolver`, { motivo });
    return response.data;
  },

  /**
   * Rejeita a candidatura com fundamentação
   */
  async rejeitar(id: number, motivo: string): Promise<any> {
    const response = await apiClient.post(`/admin/candidaturas/${id}/rejeitar`, { motivo });
    return response.data;
  },

  /**
   * Retifica / atualiza dados de uma candidatura via PUT
   */
  async atualizar(id: number, dados: Record<string, any>): Promise<any> {
    const response = await apiClient.put(`/admin/candidaturas/${id}`, dados);
    return response.data;
  },

  /**
   * Exporta a lista consolidada em Excel
   */
  async exportarExcelBlob(params?: { estado?: string; pesquisa?: string }): Promise<Blob> {
    const response = await apiClient.get('/admin/candidaturas/exportar-excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

// Exportação padrão agrupada para conveniência de importação
export const api = {
  programas: programasService,
  cursos: cursosService,
  candidaturas: candidaturasService,
  niveisAcesso: niveisAcessoService,
  auth: authService,
  admin: adminService,
};

export default api;
