import axios from 'axios';

export interface CursoItem {
  id: number;
  nome: string;
  acao: string;
  alunos_por_turma: string;
  ano_execucao: number;
  data_atualizacao: string;
  data_criacao: string | null;
  data_inicio: string;
  data_termino: string;
  descricao: string;
  duracao: number;
  duracao_mes: number;
  horario: string;
  horario_termino: string;
  local_realizacao: string;
  programa_id: number;
  programa_nome: string;
}

export interface ProgramaItem {
  id: number;
  nome: string;
  totalCursos: number;
  exigeCertificadoProfissional: boolean;
}

export const extrairProgramasDeCursos = (cursos: CursoItem[]): ProgramaItem[] => {
  const map = new Map<number, ProgramaItem>();
  cursos.forEach((c) => {
    const existing = map.get(c.programa_id);
    if (existing) {
      existing.totalCursos += 1;
    } else {
      map.set(c.programa_id, {
        id: c.programa_id,
        nome: c.programa_nome,
        totalCursos: 1,
        exigeCertificadoProfissional: Number(c.programa_id) === 2,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
};

// Consulta dinâmica da API POST /curso/busca (sem lista fixa no frontend)
export const fetchCursosBusca = async (ano?: string): Promise<CursoItem[]> => {
  const response = await axios.post<CursoItem[]>(
    '/curso/busca',
    ano ? { ano_execucao: Number(ano) } : {}
  );
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchProgramasOficiais = async (ano?: string): Promise<ProgramaItem[]> => {
  const cursos = await fetchCursosBusca(ano);
  return extrairProgramasDeCursos(cursos);
};

// Valores controlados exigidos pelo sistema
export const SEXOS_PERMITIDOS = ['Masculino', 'Feminino'] as const;

export const ESTADOS_CIVIS_PERMITIDOS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
] as const;

export const DISTRITOS_PERMITIDOS = [
  'Água Grande',
  'Mé-Zóchi',
  'Cantagalo',
  'Lobata',
  'Lembá',
  'Caué',
  'Região Autónoma do Príncipe (RAP)',
] as const;

export const NACIONALIDADES_PERMITIDAS = [
  'Santomense',
  'Angolana',
  'Caboverdiana',
  'Guineense',
  'Moçambicana',
  'Equato-guineense',
  'Portuguesa',
  'Gabonesa',
  'Outra',
] as const;

export const ARQUIVOS_IDENTIFICACAO = [
  'CICC - São Tomé (Centro de Identificação Civil e Criminal)',
  'CICC - Região Autónoma do Príncipe',
  'Conservatória dos Registos e Notariado',
  'Direção de Migração e Fronteiras (Passaporte / Título)',
  'Embaixada / Serviços Consulares',
] as const;

export const SITUACOES_EMPREGO = [
  'Candidato à Procura do 1º Emprego',
  'Desempregado à procura de Novo Emprego',
  'Empregado/Activo',
  'Empregado com horário reduzido',
  'Estudante',
  'Trabalhador por conta própria / Profissão liberal',
] as const;

export const OPCOES_CASOS_ESPECIAIS = [
  'Deficiência Visual (Parcial ou Total)',
  'Deficiência Auditiva',
  'Deficiência Motora / Mobilidade Reduzida',
  'Dificuldade de Comunicação / Fala',
  'Necessidade Educativa Especial',
  'Outra condição especial comprovada',
] as const;

export interface NivelHabilitacaoConfig {
  id: string;
  label: string;
  opcoes: string[];
  exigeAreaCurso: boolean;
  labelEspecificacao: string;
  placeholderArea?: string;
}

export const HABILITACOES_LITERARIAS_CONFIG: NivelHabilitacaoConfig[] = [
  {
    id: 'Ensino Primário - 1.º Ciclo',
    label: 'Ensino Primário — 1.º Ciclo (1.ª a 4.ª Classe)',
    opcoes: ['1.ª Classe', '2.ª Classe', '3.ª Classe', '4.ª Classe'],
    exigeAreaCurso: false,
    labelEspecificacao: 'Classe Concluída',
  },
  {
    id: 'Ensino Primário - 2.º Ciclo',
    label: 'Ensino Primário — 2.º Ciclo (5.ª e 6.ª Classe)',
    opcoes: ['5.ª Classe', '6.ª Classe'],
    exigeAreaCurso: false,
    labelEspecificacao: 'Classe Concluída',
  },
  {
    id: 'Ensino Secundário - 1.º Ciclo',
    label: 'Ensino Secundário — 1.º Ciclo (7.ª a 9.ª Classe)',
    opcoes: ['7.ª Classe', '8.ª Classe', '9.ª Classe'],
    exigeAreaCurso: false,
    labelEspecificacao: 'Classe Concluída',
  },
  {
    id: 'Ensino Secundário - 2.º Ciclo',
    label: 'Ensino Secundário — 2.º Ciclo (10.ª a 12.ª Classe)',
    opcoes: ['10.ª Classe', '11.ª Classe', '12.ª Classe'],
    exigeAreaCurso: false,
    labelEspecificacao: 'Classe Concluída',
  },
  {
    id: 'Ensino Técnico-Profissional',
    label: 'Ensino Técnico-Profissional',
    opcoes: ['Curso Básico Técnico', 'Curso Médio Técnico-Profissional'],
    exigeAreaCurso: true,
    labelEspecificacao: 'Grau Técnico',
    placeholderArea: 'Ex.: Técnico de Eletricidade, Contabilidade, Informática, Construção Civil...',
  },
  {
    id: 'Ensino Superior',
    label: 'Ensino Superior (Universitário / Politécnico)',
    opcoes: ['Bacharelato', 'Licenciatura', 'Pós-Graduação', 'Mestrado', 'Doutoramento'],
    exigeAreaCurso: true,
    labelEspecificacao: 'Grau Académico',
    placeholderArea: 'Ex.: Licenciatura em Engenharia Informática, Doutoramento em Economia...',
  },
];

export const formatarCursoLabel = (curso: CursoItem, incluirPrograma = false): string => {
  const horarioStr =
    curso.horario && curso.horario_termino
      ? `${curso.horario}–${curso.horario_termino}`
      : curso.horario || '';
  const prefixoProg = incluirPrograma ? `[${curso.programa_nome}] ` : '';
  return `${prefixoProg}${curso.nome.trim()} — ${curso.local_realizacao} (${horarioStr} · Ação ${curso.acao})`;
};
