import { jsPDF } from 'jspdf';
import { DadosInscricaoFormando } from './securityAndValidation';
import {
  SVG_CFPSTP,
  SVG_REPUBLICA_PORTUGUESA,
  SVG_COOPERACAO_PORTUGUESA,
  convertSvgToHighResDataUrl,
} from './svgLogoAssets';

export const obterNomeFicheiroPdf = (dados: DadosInscricaoFormando): string => {
  const nomeSeguroFicheiro = (dados.nome || 'Candidato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 35);

  const protocoloSeguro = (dados.protocolo || 'CFP-2026').replace(/[^a-zA-Z0-9-_]/g, '_');
  return `Ficha_Inscricao_Formando_${protocoloSeguro}_${nomeSeguroFicheiro || 'Candidato'}.pdf`;
};

export const extrairPartesData = (
  isoDate?: string
): { dia: string; mes: string; ano: string } => {
  if (!isoDate) {
    const hoje = new Date();
    return {
      dia: String(hoje.getDate()).padStart(2, '0'),
      mes: String(hoje.getMonth() + 1).padStart(2, '0'),
      ano: String(hoje.getFullYear()),
    };
  }
  const limpo = isoDate.split('T')[0];
  const partes = limpo.split('-');
  if (partes.length === 3) {
    return { dia: partes[2], mes: partes[1], ano: partes[0] };
  }
  const barra = limpo.split('/');
  if (barra.length === 3) {
    return { dia: barra[0], mes: barra[1], ano: barra[2] };
  }
  return { dia: '', mes: '', ano: '' };
};

export const obterNumeroSequencia = (dados: DadosInscricaoFormando): string => {
  if (dados.numero_inscricao) return dados.numero_inscricao;
  if (dados.protocolo) {
    const partes = dados.protocolo.split('-');
    return partes[partes.length - 1] || dados.protocolo;
  }
  return '0001';
};

export const obterNumeroProcesso = (dados: DadosInscricaoFormando): string => {
  if (dados.numero_processo) return dados.numero_processo;
  if (dados.protocolo) return dados.protocolo;
  const seq = obterNumeroSequencia(dados);
  const { mes, ano } = extrairPartesData(dados.data_inscricao);
  return `${seq}/${mes || '10'}/${ano || dados.ano || '2026'}`;
};

export const verificarProgramaSelecionado = (
  dados: DadosInscricaoFormando,
  chavePrograma:
    | 'QUALIFICACAO_INICIAL'
    | 'APRENDIZAGEM'
    | 'APERFEICOAMENTO'
    | 'ESTAGIO'
    | 'QUALIFICACAO_EMPREGO'
    | 'ACPE'
    | 'OUTROS'
): boolean => {
  const progNome = (dados.programa_nome || '').toUpperCase();
  const progId = Number(dados.programa_id || 0);

  switch (chavePrograma) {
    case 'QUALIFICACAO_INICIAL':
      return (
        progId === 1 ||
        (progNome.includes('QUALIFICA') && !progNome.includes('EMPREGO'))
      );
    case 'APRENDIZAGEM':
      return progId === 4 || progNome.includes('APRENDIZAGEM');
    case 'APERFEICOAMENTO':
      return progId === 3 || progNome.includes('APERFEI');
    case 'ESTAGIO':
      return progId === 2 || progNome.includes('ESTÁGIO') || progNome.includes('ESTAGIO');
    case 'QUALIFICACAO_EMPREGO':
      return progNome.includes('QUALIFICAÇÃO E EMPREGO') || progNome.includes('EMPREGO');
    case 'ACPE':
      return progId === 5 || progNome.includes('ACPE') || progNome.includes('GESTÃO') || progNome.includes('GESTAO');
    case 'OUTROS':
      return (
        Boolean(progNome) &&
        !verificarProgramaSelecionado(dados, 'QUALIFICACAO_INICIAL') &&
        !verificarProgramaSelecionado(dados, 'APRENDIZAGEM') &&
        !verificarProgramaSelecionado(dados, 'APERFEICOAMENTO') &&
        !verificarProgramaSelecionado(dados, 'ESTAGIO') &&
        !verificarProgramaSelecionado(dados, 'QUALIFICACAO_EMPREGO') &&
        !verificarProgramaSelecionado(dados, 'ACPE')
      );
  }
};

export const gerarPdfFormularioInscricao = async (dados: DadosInscricaoFormando): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginL = 16; // Margem esquerda profissional
  const marginR = 16; // Margem direita profissional
  const rightEdge = pageWidth - marginR; // 194mm

  const greenR = 16;
  const greenG = 124;
  const greenB = 41;

  // Carrega os 3 logótipos SVG com viewBox e proporção exatas mantidas
  const [logoRepublica, logoCfp, logoCooperacao] = await Promise.all([
    convertSvgToHighResDataUrl(SVG_REPUBLICA_PORTUGUESA, 11, 1200, 787, 4),
    convertSvgToHighResDataUrl(SVG_CFPSTP, 13, 223, 234, 4),
    convertSvgToHighResDataUrl(SVG_COOPERACAO_PORTUGUESA, 10, 3830, 1472, 4),
  ]);

  // Helper: Desenha o Cabeçalho Oficial com Logo SVG do CFP-STP no topo
  const drawOfficialHeader = () => {
    const cx = pageWidth / 2; // 105mm

    // Logo SVG do CFP-STP no topo
    if (logoCfp.dataUrl) {
      const topLogoW = logoCfp.widthMm;
      const topLogoH = logoCfp.heightMm;
      doc.addImage(
        logoCfp.dataUrl,
        'PNG',
        cx - topLogoW / 2,
        10,
        topLogoW,
        topLogoH
      );
    }

    // Título Institucional Oficial com Tipografia mais Carregada
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(greenR, greenG, greenB);
    doc.text(
      'CENTRO DE FORMAÇÃO PROFISSIONAL DE SÃO TOMÉ E PRÍNCIPE',
      cx,
      26.5,
      { align: 'center' }
    );
  };

  // Helper: Desenha o Rodapé Institucional com os 3 Logótipos em SVG e Número da Página
  const drawOfficialFooter = (paginaTexto: '1/2' | '2/2') => {
    const footerLineY = 268;
    const footerCenterY = 276; // Eixo horizontal central para alinhamento dos logótipos

    // Linha divisória discreta e elegante acima do rodapé
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(marginL, footerLineY, rightEdge, footerLineY);

    // 1. Esquerda: República Portuguesa (SVG sem distorção, centrado verticalmente)
    if (logoRepublica.dataUrl) {
      const hRep = logoRepublica.heightMm;
      const wRep = logoRepublica.widthMm;
      doc.addImage(
        logoRepublica.dataUrl,
        'PNG',
        marginL,
        footerCenterY - hRep / 2,
        wRep,
        hRep
      );
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text('REPÚBLICA PORTUGUESA', marginL, footerCenterY);
    }

    // 2. Centro: CFP-STP (SVG sem distorção, centrado verticalmente)
    if (logoCfp.dataUrl) {
      const cfpFooterW = logoCfp.widthMm * 0.75;
      const cfpFooterH = logoCfp.heightMm * 0.75;
      const midX = pageWidth / 2 - cfpFooterW / 2;
      doc.addImage(
        logoCfp.dataUrl,
        'PNG',
        midX,
        footerCenterY - cfpFooterH / 2,
        cfpFooterW,
        cfpFooterH
      );
    }

    // 3. Direita: Cooperação Portuguesa (SVG sem distorção, centrado verticalmente)
    if (logoCooperacao.dataUrl) {
      const coopW = logoCooperacao.widthMm;
      const coopH = logoCooperacao.heightMm;
      const coopX = rightEdge - coopW - 22; // Espaço reservado para o número de página no canto direito
      doc.addImage(
        logoCooperacao.dataUrl,
        'PNG',
        coopX,
        footerCenterY - coopH / 2,
        coopW,
        coopH
      );
    }

    // Número da Página no Canto Inferior Direito (sem sobreposição)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Página ${paginaTexto}`, rightEdge, footerCenterY + 1.5, { align: 'right' });
  };

  // Helper: Desenha Linha pautada com Valor Preenchido
  const drawUnderlinedValue = (
    xStart: number,
    xEnd: number,
    yLine: number,
    value?: string,
    options?: {
      lineColor?: [number, number, number];
      textColor?: [number, number, number];
      align?: 'left' | 'center';
      fontSize?: number;
      bold?: boolean;
    }
  ) => {
    const [lr, lg, lb] = options?.lineColor || [148, 163, 184];
    const [tr, tg, tb] = options?.textColor || [15, 23, 42];
    doc.setDrawColor(lr, lg, lb);
    doc.setLineWidth(0.25);
    doc.line(xStart, yLine, xEnd, yLine);

    if (value && value.trim()) {
      doc.setFont('times', options?.bold ? 'bold' : 'normal');
      doc.setFontSize(options?.fontSize || 9.5);
      doc.setTextColor(tr, tg, tb);
      const maxW = Math.max(8, xEnd - xStart - 2);
      const textoCortado = doc.splitTextToSize(value.trim(), maxW)[0] || '';
      if (options?.align === 'center') {
        doc.text(textoCortado, (xStart + xEnd) / 2, yLine - 0.9, { align: 'center' });
      } else {
        doc.text(textoCortado, xStart + 1.2, yLine - 0.9);
      }
    }
  };

  // ============================================================================
  // PÁGINA 1 (1/2) — IDENTIFICAÇÃO, HABILITAÇÕES, FORMAÇÃO, EXPERIÊNCIA E OPÇÕES
  // ============================================================================
  drawOfficialHeader();

  // Faixa verde central: FICHA DE INSCRIÇÃO DO FORMANDO
  const badgeW = 75;
  const badgeH = 5.5;
  const badgeX = (pageWidth - badgeW) / 2;
  const badgeY = 32.5;
  doc.setFillColor(greenR, greenG, greenB);
  doc.rect(badgeX, badgeY, badgeW, badgeH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('FICHA DE INSCRIÇÃO DO FORMANDO', pageWidth / 2, badgeY + 4, {
    align: 'center',
  });

  // Moldura da FOTO (Direita)
  const photoX = 156;
  const photoY = 40;
  const photoW = 32;
  const photoH = 40;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.35);
  doc.rect(photoX, photoY, photoW, photoH);

  if (dados.fotoPreview && dados.fotoPreview.startsWith('data:image/')) {
    try {
      const format = dados.fotoPreview.includes('image/png')
        ? 'PNG'
        : dados.fotoPreview.includes('image/webp')
        ? 'WEBP'
        : 'JPEG';
      doc.addImage(
        dados.fotoPreview,
        format,
        photoX + 0.6,
        photoY + 0.6,
        photoW - 1.2,
        photoH - 1.2
      );
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('FOTOGRAFIA', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('FOTOGRAFIA', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  // Metadados Superiores à Esquerda (Processo & Inscrição)
  const seqNum = obterNumeroSequencia(dados);
  const dataInsc = extrairPartesData(dados.data_inscricao);
  const numProc = obterNumeroProcesso(dados);

  let y = 44.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('N.º de Inscrição:', marginL, y);
  drawUnderlinedValue(marginL + 30, marginL + 72, y + 0.4, seqNum, {
    lineColor: [greenR, greenG, greenB],
    textColor: [15, 23, 42],
    align: 'center',
    bold: true,
  });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('Data de Inscrição:', marginL, y);
  drawUnderlinedValue(marginL + 30, marginL + 42, y + 0.3, dataInsc.dia, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });
  doc.text('/', marginL + 42.8, y);
  drawUnderlinedValue(marginL + 44.5, marginL + 56.5, y + 0.3, dataInsc.mes, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });
  doc.text('/', marginL + 57.2, y);
  drawUnderlinedValue(marginL + 59, marginL + 72, y + 0.3, dataInsc.ano, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('PROCESSO:', marginL, y);
  drawUnderlinedValue(marginL + 24, marginL + 72, y + 0.3, numProc, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
    fontSize: 9.5,
    bold: true,
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('(Processo de candidatura/mês/ano)', marginL + 74, y);

  // Secção 1 - Identificação do Candidato
  y = 75;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('1 - Identificação do Candidato:', marginL, y);

  const lineStep = 6.8;
  y = 87;

  // Nome Completo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Nome:', marginL, y);
  drawUnderlinedValue(marginL + 12, rightEdge, y + 0.4, dados.nome, {
    bold: true,
    fontSize: 10,
  });

  // Filiação Pai
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Filiação: Pai', marginL, y);
  drawUnderlinedValue(marginL + 21, rightEdge, y + 0.4, dados.nome_pai);

  // Mãe
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Mãe', marginL + 13, y);
  drawUnderlinedValue(marginL + 21, rightEdge, y + 0.4, dados.nome_mae);

  // N.º de B.I. & Arquivo de Identificação (Mapeado corretamente!)
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('N.º de B.I.:', marginL, y);
  drawUnderlinedValue(marginL + 18, marginL + 80, y + 0.4, dados.bi, { bold: true });
  
  doc.setFont('helvetica', 'bold');
  doc.text('Arquivo de Identificação:', marginL + 82, y);
  drawUnderlinedValue(
    marginL + 123,
    rightEdge,
    y + 0.4,
    dados.arquivo_identificacao
  );

  // N.º de Identificação Fiscal (NIF)
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('N.º de Identificação Fiscal (NIF):', marginL, y);
  drawUnderlinedValue(marginL + 52, marginL + 110, y + 0.4, dados.nif);

  // Data de Nascimento, Sexo e Idade
  y += lineStep;
  const dn = extrairPartesData(dados.datanascimento);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Data de Nascimento:', marginL, y);
  drawUnderlinedValue(marginL + 34, marginL + 44, y + 0.4, dn.dia, {
    align: 'center',
  });
  doc.text('/', marginL + 44.5, y);
  drawUnderlinedValue(marginL + 46, marginL + 56, y + 0.4, dn.mes, {
    align: 'center',
  });
  doc.text('/', marginL + 56.5, y);
  drawUnderlinedValue(marginL + 58, marginL + 70, y + 0.4, dn.ano, {
    align: 'center',
  });

  doc.text('Sexo:', marginL + 72, y);
  drawUnderlinedValue(marginL + 82, marginL + 115, y + 0.4, dados.sexo, {
    align: 'center',
  });

  doc.text('Idade:', marginL + 117, y);
  drawUnderlinedValue(
    marginL + 128,
    rightEdge,
    y + 0.4,
    dados.idade ? `${dados.idade} anos` : '',
    { align: 'center' }
  );

  // Nacionalidade & Local de Nascimento
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Nacionalidade:', marginL, y);
  drawUnderlinedValue(marginL + 25, marginL + 80, y + 0.4, dados.nacionalidade);

  doc.text('Naturalidade:', marginL + 82, y);
  drawUnderlinedValue(marginL + 105, rightEdge, y + 0.4, dados.naturalidade);

  // Estado Civil & Agregado Familiar
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Estado Civil:', marginL, y);
  drawUnderlinedValue(marginL + 22, marginL + 80, y + 0.4, dados.estado_civil);

  doc.text('N.º Agregado Familiar:', marginL + 82, y);
  drawUnderlinedValue(
    marginL + 120,
    rightEdge,
    y + 0.4,
    dados.agregado_familiar,
    { align: 'center' }
  );

  // Morada & Distrito
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Morada:', marginL, y);
  drawUnderlinedValue(marginL + 15, marginL + 110, y + 0.4, dados.morada);

  doc.text('Distrito:', marginL + 112, y);
  drawUnderlinedValue(marginL + 126, rightEdge, y + 0.4, dados.distrito);

  // Contacto Telefónico & Email
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Contacto Telefónico:', marginL, y);
  const contactosTexto = [
    dados.telefone,
    dados.telefone2 ? `Alt: ${dados.telefone2}` : '',
    dados.email ? `Email: ${dados.email}` : '',
  ]
    .filter(Boolean)
    .join('   |   ');
  drawUnderlinedValue(marginL + 34, rightEdge, y + 0.4, contactosTexto);

  // Ocupação
  y += lineStep;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Ocupação Atual:', marginL, y);
  drawUnderlinedValue(marginL + 26, rightEdge, y + 0.4, dados.ocupacao);

  // Secção 2 – Habilitações Literárias
  y += 11.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('2 – Habilitações Literárias', marginL, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('(concluídas):', marginL + 45, y);
  drawUnderlinedValue(marginL + 67, rightEdge, y + 0.4, dados.habilitacao, {
    bold: true,
  });

  // Helper para desenhar linhas de texto pautado (Secções 3, 4 e 5)
  const drawRuledParagraph = (
    yFirstLine: number,
    numLines: number,
    lastLineRightOffset: number,
    textValue?: string
  ): number => {
    const fullW = rightEdge - marginL;
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    const linhasTexto = textValue?.trim()
      ? doc.splitTextToSize(textValue.trim(), fullW - 4)
      : [];

    let curY = yFirstLine;
    for (let i = 0; i < numLines; i++) {
      const endX = i === numLines - 1 ? rightEdge - lastLineRightOffset : rightEdge;
      drawUnderlinedValue(marginL, endX, curY, linhasTexto[i] || '');
      curY += 6.5;
    }
    return curY;
  };

  // Secção 3 – Formação Profissional
  y += 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('3 – Formação Profissional Anterior', marginL, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    '(Curso, local, duração e data de conclusão):',
    marginL + 58,
    y
  );
  y = drawRuledParagraph(y + 7, 3, 40, dados.formacao_profissional);

  // Secção 4 – Experiência Profissional
  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('4 – Experiência Profissional', marginL, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    '(Local de trabalho, funções exercidas e tempo de serviço):',
    marginL + 48,
    y
  );
  y = drawRuledParagraph(y + 7, 3, 40, dados.experiencia_profissional);

  // Secção 5 – Motivo da Inscrição
  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('5 – Motivo da Inscrição no Centro de Formação:', marginL, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28);
  doc.text('(preenchimento obrigatório)', marginL + 82, y);
  y = drawRuledParagraph(y + 7, 2, 30, dados.motivo_inscricao);

  // Secção 5.1 – Cursos Pretendidos (1ª e 2ª Opção)
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('5.1 – Curso ou Área de Formação Pretendida pelo Candidato:', marginL, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1.ª Opção:', marginL, y);
  const textoOpcao1 = dados.curso_nome
    ? `${dados.curso_nome}${dados.programa_nome ? ` — ${dados.programa_nome}` : ''}${
        dados.curso_local ? ` (${dados.curso_local})` : ''
      }`
    : '';
  drawUnderlinedValue(marginL + 18, rightEdge, y + 0.4, textoOpcao1, {
    bold: true,
    fontSize: 9.5,
  });

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2.ª Opção:', marginL, y);
  const textoOpcao2 = dados.curso_opcao_2_nome
    ? `${dados.curso_opcao_2_nome}${
        dados.curso_opcao_2_programa ? ` — ${dados.curso_opcao_2_programa}` : ''
      }`
    : '';
  drawUnderlinedValue(marginL + 18, rightEdge, y + 0.4, textoOpcao2);

  // Rodapé Oficial da Página 1
  drawOfficialFooter('1/2');

  // ============================================================================
  // PÁGINA 2 (2/2) — SERVIÇOS, SITUAÇÃO DE EMPREGO, CASOS ESPECIAIS E PROGRAMA
  // ============================================================================
  doc.addPage();
  drawOfficialHeader();

  // Título Sublinhado: A PREENCHER PELOS SERVIÇOS
  let y2 = 44;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const tituloServicos = 'A PREENCHER PELOS SERVIÇOS';
  doc.text(tituloServicos, pageWidth / 2, y2, { align: 'center' });
  const wServ = doc.getTextWidth(tituloServicos);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.line((pageWidth - wServ) / 2, y2 + 0.8, (pageWidth + wServ) / 2, y2 + 0.8);

  // Helper para desenhar linha com pontilhado e caixa de seleção [ ]
  const drawDottedCheckboxRow = (
    labelLeft: string,
    xStartText: number,
    yRow: number,
    checked: boolean,
    boxX = 175,
    boxW = 6.5,
    boxH = 3.4
  ) => {
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(labelLeft, xStartText, yRow);

    const textW = doc.getTextWidth(labelLeft);
    const dotsStartX = xStartText + textW + 1.5;
    const dotsEndX = boxX - 3.5;

    if (dotsEndX > dotsStartX) {
      doc.setLineDashPattern([0.4, 1.1], 0);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.25);
      doc.line(dotsStartX, yRow - 0.3, dotsEndX, yRow - 0.3);
      doc.setLineDashPattern([], 0);
    }

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.rect(boxX, yRow - boxH + 0.4, boxW, boxH);

    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(greenR, greenG, greenB);
      doc.text('X', boxX + boxW / 2, yRow + 0.1, { align: 'center' });
    }
  };

  // Secção 6 – Situação do Candidato perante o Emprego
  y2 = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('6 – Situação do Candidato perante o Emprego', marginL, y2);

  const sitEmp = (dados.situacao_emprego || '').toLowerCase();
  const isPrimeiroEmprego = sitEmp.includes('1º emprego') || sitEmp.includes('1.º emprego');
  const isNovoEmprego = sitEmp.includes('novo emprego');
  const isEmpregadoActivo =
    (sitEmp.includes('empregado') || sitEmp.includes('trabalhador') || sitEmp.includes('activo')) &&
    !sitEmp.includes('desempregado') &&
    !sitEmp.includes('reduzido');
  const isHorarioReduzido = sitEmp.includes('reduzido');
  const isEstudante = sitEmp.includes('estudante');

  // Lista de itens da Secção 6
  y2 += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('1.', marginL, y2);
  drawDottedCheckboxRow(
    'Candidato à Procura do 1.º Emprego',
    marginL + 6.5,
    y2,
    isPrimeiroEmprego
  );

  y2 += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('2.', marginL, y2);
  drawDottedCheckboxRow(
    'Desempregado à procura de Novo Emprego',
    marginL + 6.5,
    y2,
    isNovoEmprego
  );

  y2 += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Atividade profissional anterior:', marginL + 6.5, y2);
  const ativAnterior =
    dados.atividade_profissional_anterior ||
    (isNovoEmprego ? dados.experiencia_profissional || dados.ocupacao : '');
  drawUnderlinedValue(marginL + 50, 142, y2 + 0.4, ativAnterior, { fontSize: 8.5 });

  y2 += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('3.', marginL, y2);
  drawDottedCheckboxRow('Empregado / Trabalhador Ativo', marginL + 6.5, y2, isEmpregadoActivo);

  y2 += 5;
  drawDottedCheckboxRow(
    'Empregado com horário reduzido',
    marginL + 6.5,
    y2,
    isHorarioReduzido
  );

  y2 += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Função que exerce:', marginL + 6.5, y2);
  const funcaoVal =
    dados.funcao_exerce ||
    (isEmpregadoActivo || isHorarioReduzido ? dados.ocupacao : '');
  drawUnderlinedValue(marginL + 36, 122, y2 + 0.4, funcaoVal, { fontSize: 8.5 });
  doc.text('desde:', 124, y2);
  drawUnderlinedValue(134, 160, y2 + 0.4, dados.funcao_desde || '', {
    fontSize: 8.5,
    align: 'center',
  });

  y2 += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('4.', marginL, y2);
  doc.text('Profissão:', marginL + 6.5, y2);
  drawUnderlinedValue(
    marginL + 22,
    145,
    y2 + 0.4,
    dados.profissao || (!isEstudante ? dados.ocupacao : ''),
    { fontSize: 9 }
  );

  y2 += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('5.', marginL, y2);
  drawDottedCheckboxRow('Estudante', marginL + 6.5, y2, isEstudante);

  y2 += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Nível de Escolaridade:', marginL + 6.5, y2);
  doc.setLineDashPattern([0.4, 1.1], 0);
  doc.line(marginL + 40, y2 - 0.2, 125, y2 - 0.2);
  doc.setLineDashPattern([], 0);
  if (dados.habilitacao) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      doc.splitTextToSize(dados.habilitacao, 82)[0] || '',
      marginL + 41.5,
      y2 - 0.8
    );
  }

  // Secção 7 – Casos Especiais
  y2 = 114;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('7 – Casos Especiais:', marginL, y2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28);
  doc.text('(preenchimento obrigatório)', marginL + 38, y2);

  y2 += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Deficiente:', marginL, y2);
  drawUnderlinedValue(
    marginL + 18,
    marginL + 28,
    y2 + 0.4,
    dados.possui_caso_especial === 'Sim' ? 'Sim' : 'Não',
    { align: 'center', fontSize: 8.5 }
  );

  doc.text('Encaminhado por Instituição de Apoio Social:', marginL + 31, y2);
  drawUnderlinedValue(
    marginL + 98,
    marginL + 108,
    y2 + 0.4,
    dados.encaminhado_apoio_social || 'Não',
    { align: 'center', fontSize: 8.5 }
  );

  doc.text('Qual:', marginL + 110, y2);
  const qualCasoTexto =
    dados.instituicao_apoio_social ||
    (dados.possui_caso_especial === 'Sim' ? dados.casos_especiais : '');
  drawUnderlinedValue(marginL + 120, rightEdge, y2 + 0.4, qualCasoTexto, {
    fontSize: 8.5,
  });

  y2 += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Encaminhado por outra instituição: Qual', marginL, y2);
  drawUnderlinedValue(
    marginL + 60,
    rightEdge,
    y2 + 0.4,
    dados.encaminhado_outra_instituicao || '',
    { fontSize: 8.5 }
  );

  // SITUAÇÃO DA CANDIDATURA
  y2 = 148;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const tituloSitCand = 'SITUAÇÃO DA CANDIDATURA';
  doc.text(tituloSitCand, pageWidth / 2, y2, { align: 'center' });
  const wSit = doc.getTextWidth(tituloSitCand);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.line((pageWidth - wSit) / 2, y2 + 0.9, (pageWidth + wSit) / 2, y2 + 0.9);

  // Secção 8 – O candidato ficou inscrito no CURSO
  y2 = 162;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('8 – O candidato ficou inscrito no CURSO:', marginL, y2);

  const cursoInscritoLinha1 = dados.curso_nome || '';
  const cursoInscritoLinha2 = [
    dados.curso_local ? `Local: ${dados.curso_local}` : '',
    dados.curso_horario ? `Horário: ${dados.curso_horario}` : '',
    dados.curso_acao ? `Ação: ${dados.curso_acao}` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');

  drawUnderlinedValue(marginL + 70, rightEdge, y2 + 0.4, cursoInscritoLinha1, {
    bold: true,
    fontSize: 9.5,
  });
  y2 += 6.5;
  drawUnderlinedValue(marginL + 70, rightEdge, y2 + 0.4, cursoInscritoLinha2, {
    fontSize: 8.8,
  });

  // PROGRAMA
  y2 = 178;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('PROGRAMA', marginL, y2);

  const listaProgramasOficiais: Array<{
    label: string;
    chave:
      | 'QUALIFICACAO_INICIAL'
      | 'APRENDIZAGEM'
      | 'APERFEICOAMENTO'
      | 'ESTAGIO'
      | 'QUALIFICACAO_EMPREGO'
      | 'ACPE'
      | 'OUTROS';
  }> = [
    { label: 'QUALIFICAÇÃO INICIAL', chave: 'QUALIFICACAO_INICIAL' },
    { label: 'APRENDIZAGEM PROFISSIONAL', chave: 'APRENDIZAGEM' },
    { label: 'APERFEIÇOAMENTO PROFISSIONAL', chave: 'APERFEICOAMENTO' },
    { label: 'ESTÁGIO PROFISSIONAL', chave: 'ESTAGIO' },
    { label: 'QUALIFICAÇÃO E EMPREGO', chave: 'QUALIFICACAO_EMPREGO' },
    { label: 'CURSO DE GESTÃO / ACPE', chave: 'ACPE' },
    { label: 'OUTROS', chave: 'OUTROS' },
  ];

  y2 += 5;
  listaProgramasOficiais.forEach((itemProg) => {
    const marcado = verificarProgramaSelecionado(dados, itemProg.chave);
    drawDottedCheckboxRow(itemProg.label, marginL, y2, marcado, 175, 6.5, 3.2);
    y2 += 4.8;
  });

  // Secção 9 – Declaração de Autorização e Divulgação
  y2 = 217;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '9. – Caso seja selecionado, permitirá que seus dados sejam divulgados? Sim',
    marginL,
    y2
  );
  const autorizaSim = (dados.autoriza_divulgacao_dados || 'Sim') === 'Sim';
  drawUnderlinedValue(
    marginL + 110,
    marginL + 122,
    y2 + 0.4,
    autorizaSim ? 'X' : '',
    { align: 'center', bold: true }
  );
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text('Não', marginL + 124, y2);
  drawUnderlinedValue(
    marginL + 132,
    marginL + 144,
    y2 + 0.4,
    !autorizaSim ? 'X' : '',
    { align: 'center', bold: true }
  );

  // Recebido por & Assinatura do Candidato(a)
  y2 = 230;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Recebido por: :................................................', marginL, y2);
  doc.text('Assinatura do Candidato(a)', 136, y2);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(128, y2 + 9.5, rightEdge, y2 + 9.5);

  // Linha divisória inferior antes da Nota
  y2 = 246;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.25);
  doc.line(marginL, y2, rightEdge, y2);

  // Nota obrigatória de documentação
  y2 = 254;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Nota:', marginL, y2);
  doc.setFont('helvetica', 'normal');
  doc.text('Deve-se anexar à ficha de inscrição,', marginL + 7.5, y2);
  doc.setFont('helvetica', 'bold');
  doc.text('OBRIGATORIAMENTE,', marginL + 50, y2);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'a fotocópia do Bilhete de Identidade, Cartão de Identificação Fiscal (NIF),',
    marginL + 82,
    y2
  );
  doc.text(
    'Certificado de Habilitações Literárias (autenticado) e declaração de serviço para inscritos que trabalham.',
    marginL,
    y2 + 4
  );

  // Rodapé Oficial da Página 2
  drawOfficialFooter('2/2');

  // Guardar e descarregar o ficheiro PDF
  const fileName = obterNomeFicheiroPdf(dados);
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch {
    doc.save(fileName);
  }
};
