import * as XLSX from 'xlsx';
import { DadosInscricaoFormando } from './securityAndValidation';
import { gerarPdfFormularioInscricao } from './gerarPdfInscricao';

export const gerarFichaInscricaoPDF = (dados: DadosInscricaoFormando): void => {
  gerarPdfFormularioInscricao(dados);
};

export const exportarInscricaoParaExcel = (dados: DadosInscricaoFormando): void => {
  // Exporta com os nomes exatos das colunas esperadas pelo ImportarFormandos
  const linhaCompativel = [
    {
      Protocolo: dados.protocolo,
      Nome: dados.nome,
      Sexo: dados.sexo,
      'Data de Nascimento': dados.datanascimento,
      Idade: dados.idade,
      'Nº BI': dados.bi,
      'Arquivo de Identificação': dados.arquivo_identificacao,
      NIF: dados.nif,
      'Estado Civil': dados.estado_civil,
      Nacionalidade: dados.nacionalidade,
      Naturalidade: dados.naturalidade,
      'Nome do Pai': dados.nome_pai,
      'Nome da Mãe': dados.nome_mae,
      Distrito: dados.distrito,
      'Morada (Residência)': dados.morada,
      'Agregado Familiar': dados.agregado_familiar,
      'Telefone (Cont.)': dados.telefone,
      'Telefone Alternativo': dados.telefone2,
      Email: dados.email,
      Ocupação: dados.ocupacao,
      'Habilitações Literárias': dados.habilitacao,
      'Formação Profissional': dados.formacao_profissional,
      'Experiência Profissional': dados.experiencia_profissional,
      'Situação Perante Emprego': dados.situacao_emprego,
      'Casos Especiais': dados.possui_caso_especial === 'Sim' ? dados.casos_especiais : 'Não',
      Programa: dados.programa_nome,
      'Curso 1ª Opção': dados.curso_nome,
      'Curso 2ª Opção': dados.curso_opcao_2_nome || '—',
      'Motivo da Inscrição': dados.motivo_inscricao,
      'Data Inscrição': dados.data_inscricao,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(linhaCompativel);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscricao');
  const nomeSeguro = (dados.nome || 'Candidato')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 25);
  XLSX.writeFile(workbook, `Formulario_Inscricao_${dados.protocolo || 'CFP'}_${nomeSeguro}.xlsx`);
};
