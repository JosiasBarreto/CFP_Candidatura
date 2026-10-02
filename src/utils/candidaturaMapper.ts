import { CandidaturaPublica } from '../types';
import { DadosInscricaoFormando } from './securityAndValidation';

export function converterCandidaturaParaDadosFicha(
  cand: CandidaturaPublica
): DadosInscricaoFormando {
  const c1 = cand.curso_opcao1;
  const c2 = cand.curso_opcao2;
  const horario1 =
    c1?.horario && c1?.horario_termino
      ? `${c1.horario}–${c1.horario_termino}`
      : c1?.horario || '08:00–12:00';
  const horario2 =
    c2?.horario && c2?.horario_termino
      ? `${c2.horario}–${c2.horario_termino}`
      : c2?.horario || '';

  return {
    id: String(cand.id),
    protocolo: cand.codigo,
    numero_inscricao: cand.codigo,
    numero_processo:
      cand.processo_numero || `CFP${(cand.bi || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`,
    nome: cand.nome || '',
    nome_pai: cand.nome_pai || '',
    nome_mae: cand.nome_mae || '',
    bi: cand.bi || '',
    arquivo_identificacao:
      cand.arquivo_identificacao || 'Centro de Identificação Civil e Criminal (CICC - STP)',
    nif: cand.nif || '',
    datanascimento: cand.data_nascimento || '',
    idade: String(cand.idade || 22),
    sexo: cand.sexo || 'Masculino',
    nacionalidade: cand.nacionalidade || 'Santomense',
    naturalidade: cand.naturalidade || cand.distrito || 'São Tomé',
    estado_civil: cand.estado_civil || 'Solteiro(a)',
    agregado_familiar: cand.agregado || '1',
    morada: cand.morada || cand.zona || '',
    distrito: cand.distrito || 'Água Grande',
    telefone: cand.contacto || '',
    telefone2: cand.contacto_alternativo || '',
    email: cand.email || '',
    ocupacao: cand.ocupacao || '',
    habilitacao_nivel: cand.habilitacao_nivel || '10_12',
    habilitacao_classe: cand.habilitacao_classe || cand.habilitacao_literaria || '12.ª Classe',
    habilitacao_area: cand.habilitacao_area || '',
    habilitacao: cand.habilitacao_literaria || '12.ª Classe',
    formacao_profissional: cand.formacao_profissional || '',
    experiencia_profissional: cand.experiencia_profissional || '',
    motivo_inscricao: cand.motivo_inscricao || '',
    situacao_emprego: cand.situacao_emprego || 'primeiro_emprego',
    atividade_profissional_anterior: cand.atividade_profissional_anterior || '',
    funcao_exerce: cand.funcao_exerce || '',
    funcao_desde: cand.funcao_desde || '',
    profissao: cand.profissao || '',
    possui_caso_especial: cand.deficiente ? 'Sim' : 'Não',
    casos_especiais: cand.tipo_deficiencia || '',
    encaminhado_apoio_social: cand.encaminhado_apoio_social ? 'Sim' : 'Não',
    instituicao_apoio_social: cand.instituicao_apoio_social || '',
    encaminhado_outra_instituicao: '',
    autoriza_divulgacao_dados: cand.autorizacao_divulgacao_dados ? 'Sim' : 'Não',
    observacao: cand.observacao || '',
    programa_id: String(cand.programa_id),
    programa_nome: cand.programa?.nome || c1?.programa_nome || 'Qualificação Profissional',
    curso_id: String(cand.curso_opcao1_id),
    curso_nome: c1?.nome || '',
    curso_acao: c1?.acao || '01/2026',
    curso_horario: horario1,
    curso_local: c1?.local_realizacao || 'CFP-STP',
    programa_opcao_2_id: c2 ? String(c2.fk_programa) : '',
    curso_opcao_2_id: cand.curso_opcao2_id ? String(cand.curso_opcao2_id) : '',
    curso_opcao_2_nome: c2?.nome || '',
    curso_opcao_2_programa: c2?.programa_nome || cand.programa?.nome || '',
    curso_opcao_2_horario: horario2,
    curso_opcao_2_local: c2?.local_realizacao || '',
    ano: String(cand.ano || 2026),
    situacao: cand.estado,
    data_inscricao: (cand.data_criacao || '').substring(0, 10),
    foto: null,
    fotoPreview: cand.foto_data_url || '',
    fotoDimensoes: null,
    doc_bi: null,
    doc_nif: null,
    doc_certificado_habilitacao: null,
    doc_certificado_profissional: null,
    aceita_declaracao: true,
  };
}
