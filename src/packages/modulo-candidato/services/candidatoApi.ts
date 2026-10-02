import { ProgramaPublico, CursoPublico, CandidaturaPublica } from '../types';
import {
  programasService,
  cursosService,
  candidaturasService,
  apiClient,
} from '../../../services/api';

export const candidatoApi = {
  async listarProgramas(): Promise<ProgramaPublico[]> {
    return programasService.listar();
  },

  async listarCursos(programaId?: number): Promise<CursoPublico[]> {
    return cursosService.listar(programaId);
  },

  async submeterCandidaturaPublica(formData: FormData) {
    return candidaturasService.submeter(formData);
  },

  async consultarPorBiOuCodigo(termo: string): Promise<CandidaturaPublica[]> {
    return candidaturasService.consultarPorBiOuCodigo(termo);
  },

  async corrigirCandidaturaDevolvida(
    id: number,
    dadosCorrecao: Record<string, any>,
    novosFicheiros?: Array<{ tipo: string; file: File }>
  ): Promise<CandidaturaPublica> {
    if (novosFicheiros && novosFicheiros.length > 0) {
      for (const item of novosFicheiros) {
        const fd = new FormData();
        fd.append('tipo', item.tipo);
        fd.append('observacao', 'Documento atualizado pelo candidato na correção');
        fd.append('ficheiro', item.file);
        await apiClient.post(`/candidaturas/${id}/documentos`, fd);
      }
    }

    const response = await apiClient.post<{ candidatura: CandidaturaPublica }>(
      `/candidaturas/${id}/corrigir`,
      dadosCorrecao
    );
    return response.data.candidatura;
  },

  baixarFichaOficialPdf(cand: CandidaturaPublica) {
    candidaturasService.baixarFichaPdfNavegador(cand);
  },
};

export default candidatoApi;

