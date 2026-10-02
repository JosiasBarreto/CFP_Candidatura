import { jsPDF } from 'jspdf';
import { DadosInscricaoFormando } from './securityAndValidation';

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

export const gerarPdfFormularioInscricao = (dados: DadosInscricaoFormando): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const marginL = 21;
  const marginR = 21;
  const rightEdge = pageWidth - marginR; // 189mm

  const greenR = 26;
  const greenG = 128;
  const greenB = 38;

  // Helper: Desenha o Emblema CFP-STP e o título institucional no topo da página
  const drawOfficialHeader = () => {
    const cx = pageWidth / 2; // 105mm

    // Emblema superior CFP-STP (geometria vetorial verde fiel ao logotipo oficial)
    doc.setDrawColor(greenR, greenG, greenB);
    doc.setFillColor(greenR, greenG, greenB);
    doc.setLineWidth(0.7);

    // Setas/triângulos superiores
    doc.line(cx - 5, 11, cx - 2, 14.2);
    doc.line(cx - 2, 14.2, cx - 5.5, 14.2);
    doc.line(cx, 10.2, cx, 14.2);
    doc.line(cx + 5, 11, cx + 2, 14.2);
    doc.line(cx + 2, 14.2, cx + 5.5, 14.2);

    // Faixa central com sigla CFP-STP
    doc.setLineWidth(0.35);
    doc.line(cx - 6, 14.8, cx + 6, 14.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.setTextColor(greenR, greenG, greenB);
    doc.text('CFP-STP', cx, 16.5, { align: 'center' });
    doc.line(cx - 6, 17.1, cx + 6, 17.1);

    // Setas/triângulos inferiores
    doc.setLineWidth(0.7);
    doc.line(cx - 5, 21, cx - 2, 17.8);
    doc.line(cx - 2, 17.8, cx - 5.5, 17.8);
    doc.line(cx, 21.8, cx, 17.8);
    doc.line(cx + 5, 21, cx + 2, 17.8);
    doc.line(cx + 2, 17.8, cx + 5.5, 17.8);

    // Título Institucional
    doc.setFont('times', 'normal');
    doc.setFontSize(12.2);
    doc.setTextColor(greenR, greenG, greenB);
    doc.text(
      'CENTRO DE FORMAÇÃO PROFISSIONAL DE SÃO TOMÉ E PRÍNCIPE',
      cx,
      27.5,
      { align: 'center' }
    );
  };

  // Helper: Desenha o Rodapé Oficial (1/2 ou 2/2 + 3 Emblemas Institucionais)
  const drawOfficialFooter = (paginaTexto: '1/2' | '2/2') => {
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(paginaTexto, marginL + 1, 271);

    const footerY = 277;

    // 1. Esquerda: República Portuguesa (Trabalho, Solidariedade e Segurança Social)
    doc.setFillColor(204, 34, 41);
    doc.rect(14, footerY, 1.6, 4.2, 'F');
    doc.setFillColor(26, 128, 38);
    doc.rect(15.6, footerY, 1.4, 4.2, 'F');
    doc.setFillColor(234, 179, 8);
    doc.circle(15.6, footerY + 2.1, 0.7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(30, 41, 59);
    doc.text('REPÚBLICA', 18.2, footerY + 1.6);
    doc.text('PORTUGUESA', 18.2, footerY + 3.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.8);
    doc.setTextColor(100, 116, 139);
    doc.text('TRABALHO, SOLIDARIEDADE', 18.2, footerY + 5.1);
    doc.text('E SEGURANÇA SOCIAL', 18.2, footerY + 6.5);

    // 2. Centro: CFP-STP
    const midX = 97;
    doc.setDrawColor(greenR, greenG, greenB);
    doc.setLineWidth(0.45);
    doc.line(midX - 2.5, footerY - 1, midX - 0.8, footerY + 0.8);
    doc.line(midX, footerY - 1.3, midX, footerY + 0.8);
    doc.line(midX + 2.5, footerY - 1, midX + 0.8, footerY + 0.8);
    doc.line(midX - 2.5, footerY + 3.2, midX - 0.8, footerY + 1.4);
    doc.line(midX, footerY + 3.5, midX, footerY + 1.4);
    doc.line(midX + 2.5, footerY + 3.2, midX + 0.8, footerY + 1.4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4);
    doc.setTextColor(15, 23, 42);
    doc.text('R.D. SÃO TOMÉ E PRÍNCIPE', midX, footerY + 5.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.5);
    doc.text('CENTRO DE FORMAÇÃO PROFISSIONAL', midX, footerY + 6.6, { align: 'center' });

    // 3. Direita: Cooperação Portuguesa ("C")
    const rightLogoX = 169;
    doc.setDrawColor(190, 30, 45);
    doc.setLineWidth(1.5);
    doc.line(rightLogoX, footerY - 0.5, rightLogoX + 3.6, footerY - 0.5);
    doc.line(rightLogoX, footerY - 0.5, rightLogoX, footerY + 6.2);
    doc.line(rightLogoX, footerY + 6.2, rightLogoX + 3.6, footerY + 6.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.2);
    doc.setTextColor(71, 85, 105);
    doc.text('COOPERAÇÃO', rightLogoX + 4.6, footerY + 2.5);
    doc.setTextColor(greenR, greenG, greenB);
    doc.setFontSize(5);
    doc.text('PORTUGAL', rightLogoX + 4.6, footerY + 5.8);
  };

  // Helper: Linha sublinhada com texto preenchido por cima
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
    const [lr, lg, lb] = options?.lineColor || [60, 60, 60];
    const [tr, tg, tb] = options?.textColor || [15, 23, 42];
    doc.setDrawColor(lr, lg, lb);
    doc.setLineWidth(0.22);
    doc.line(xStart, yLine, xEnd, yLine);

    if (value && value.trim()) {
      doc.setFont('times', options?.bold ? 'bold' : 'normal');
      doc.setFontSize(options?.fontSize || 10);
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
  const badgeW = 66;
  const badgeH = 5.2;
  const badgeX = (pageWidth - badgeW) / 2;
  const badgeY = 33.5;
  doc.setFillColor(greenR, greenG, greenB);
  doc.rect(badgeX, badgeY, badgeW, badgeH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FICHA DE INSCRIÇÃO DO FORMANDO', pageWidth / 2, badgeY + 3.8, {
    align: 'center',
  });

  // Moldura da FOTO (Direita)
  const photoX = 149;
  const photoY = 40;
  const photoW = 31.5;
  const photoH = 39.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
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
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('FOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('FOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  // Metadados Superiores à Esquerda (em verde)
  const seqNum = obterNumeroSequencia(dados);
  const dataInsc = extrairPartesData(dados.data_inscricao);
  const numProc = obterNumeroProcesso(dados);

  let y = 45.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('N.º de Inscrição:', marginL, y);
  drawUnderlinedValue(marginL + 32, marginL + 65, y + 0.4, seqNum, {
    lineColor: [greenR, greenG, greenB],
    textColor: [15, 23, 42],
    align: 'center',
    bold: true,
  });

  y += 8.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('Data de Inscrição', marginL, y);
  drawUnderlinedValue(marginL + 26.5, marginL + 37.5, y + 0.3, dataInsc.dia, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('/', marginL + 38.2, y);
  drawUnderlinedValue(marginL + 39.8, marginL + 51.5, y + 0.3, dataInsc.mes, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });
  doc.text('/', marginL + 52.2, y);
  drawUnderlinedValue(marginL + 53.8, marginL + 65.5, y + 0.3, dataInsc.ano, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('N.º DE PROCESSO:', marginL, y);
  drawUnderlinedValue(marginL + 30.5, marginL + 65.5, y + 0.3, numProc, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
    fontSize: 9,
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('(sequência de inscrição/mês/ano)', marginL + 67, y);

  // Secção 1 - Identificação do Candidato:
  y = 76;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('1 - Identificação do Candidato:', marginL, y);

  // Linhas da Secção 1
  const lineStep = 6.7;
  y = 89;

  // Nome:
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Nome:', marginL, y);
  drawUnderlinedValue(marginL + 11, rightEdge - 14, y + 0.4, dados.nome, {
    bold: true,
  });

  // Filiação: Pai
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Filiação: Pai', marginL, y);
  drawUnderlinedValue(marginL + 19.5, rightEdge - 14, y + 0.4, dados.nome_pai);

  // Mãe
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Mãe', marginL + 12.5, y);
  drawUnderlinedValue(marginL + 20, rightEdge - 14, y + 0.4, dados.nome_mae);

  // N.º de B.I.: _____ Arq. Ident. _____
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('N.º de B.I.:', marginL, y);
  drawUnderlinedValue(marginL + 17, marginL + 74, y + 0.4, dados.bi);
  doc.text('Arq. Ident.', marginL + 75.5, y);
  drawUnderlinedValue(
    marginL + 91.5,
    rightEdge - 14,
    y + 0.4,
    dados.arquivo_identificacao
  );

  // Nº de Identificação Fiscal _____
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Nº de Identificação Fiscal', marginL, y);
  drawUnderlinedValue(marginL + 37, marginL + 76, y + 0.4, dados.nif);

  // Data de Nascimento ___/___/___. Sexo _____ Idade _____
  y += lineStep;
  const dn = extrairPartesData(dados.datanascimento);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Data de Nascimento', marginL, y);
  drawUnderlinedValue(marginL + 28, marginL + 37.5, y + 0.4, dn.dia, {
    align: 'center',
  });
  doc.text('/', marginL + 38, y);
  drawUnderlinedValue(marginL + 39.5, marginL + 49, y + 0.4, dn.mes, {
    align: 'center',
  });
  doc.text('/', marginL + 49.5, y);
  drawUnderlinedValue(marginL + 51, marginL + 60, y + 0.4, dn.ano, {
    align: 'center',
  });
  doc.text('. Sexo', marginL + 60.5, y);
  drawUnderlinedValue(marginL + 70.5, marginL + 100.5, y + 0.4, dados.sexo, {
    align: 'center',
  });
  doc.text('Idade', marginL + 101.5, y);
  drawUnderlinedValue(
    marginL + 110.5,
    rightEdge - 14,
    y + 0.4,
    dados.idade ? `${dados.idade} anos` : '',
    { align: 'center' }
  );

  // Nacionalidade: _____ Local de Nascimento _____
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Nacionalidade:', marginL, y);
  drawUnderlinedValue(marginL + 22, marginL + 71, y + 0.4, dados.nacionalidade);
  doc.text('Local de Nascimento', marginL + 72.5, y);
  drawUnderlinedValue(marginL + 102.5, rightEdge - 14, y + 0.4, dados.naturalidade);

  // Estado Civil: _____ N.º pessoas do agregado familiar : _____
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Estado Civil:', marginL, y);
  drawUnderlinedValue(marginL + 19.5, marginL + 71.5, y + 0.4, dados.estado_civil);
  doc.text('N.º pessoas do agregado familiar :', marginL + 73, y);
  drawUnderlinedValue(
    marginL + 120,
    rightEdge - 14,
    y + 0.4,
    dados.agregado_familiar,
    { align: 'center' }
  );

  // Morada: _____ Distrito: _____
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Morada:', marginL, y);
  drawUnderlinedValue(marginL + 13, marginL + 97, y + 0.4, dados.morada);
  doc.text('Distrito:', marginL + 98, y);
  drawUnderlinedValue(marginL + 110.5, rightEdge - 14, y + 0.4, dados.distrito);

  // Contacto telefónico: _____
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Contacto telefónico:', marginL, y);
  const contactosTexto = [
    dados.telefone,
    dados.telefone2 ? `Alt: ${dados.telefone2}` : '',
    dados.email ? `Email: ${dados.email}` : '',
  ]
    .filter(Boolean)
    .join('   |   ');
  drawUnderlinedValue(marginL + 29.5, rightEdge - 14, y + 0.4, contactosTexto);

  // Ocupação: _____
  y += lineStep;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Ocupação:', marginL, y);
  drawUnderlinedValue(marginL + 15.5, rightEdge - 14, y + 0.4, dados.ocupacao);

  // 2 –Habilitações Literárias (concluídas) : _____
  y += 12.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('2 –Habilitações Literárias', marginL, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('(concluídas) :', marginL + 43.5, y);
  drawUnderlinedValue(marginL + 63.5, rightEdge - 14, y + 0.4, dados.habilitacao, {
    bold: true,
  });

  // Helper para desenhar secções de múltiplas linhas pautadas (Secções 3, 4 e 5)
  const drawRuledParagraph = (
    yFirstLine: number,
    numLines: number,
    lastLineRightOffset: number,
    textValue?: string
  ): number => {
    const fullW = rightEdge - 2 - marginL;
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    const linhasTexto = textValue?.trim()
      ? doc.splitTextToSize(textValue.trim(), fullW - 4)
      : [];

    let curY = yFirstLine;
    for (let i = 0; i < numLines; i++) {
      const endX = i === numLines - 1 ? rightEdge - lastLineRightOffset : rightEdge - 2;
      drawUnderlinedValue(marginL, endX, curY, linhasTexto[i] || '');
      curY += 6.5;
    }
    return curY;
  };

  // 3 –Formação Profissional
  y += 12;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('3 –Formação Profissional', marginL, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.2);
  doc.text(
    '(Se já frequentou algum Curso de formação diga o curso, local , duração e data conclusão)',
    marginL + 42.5,
    y
  );
  y = drawRuledParagraph(y + 7.5, 3, 45, dados.formacao_profissional);

  // 4- Experiência Profissional
  y += 5.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('4- Experiência Profissional', marginL, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    '(Se já trabalhou refira local de trabalho, funções exercidas e tempo de serviço).',
    marginL + 45.5,
    y
  );
  y = drawRuledParagraph(y + 7.5, 3, 45, dados.experiencia_profissional);

  // 5- Motivo da Inscrição no Centro de Formação:
  y += 5.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('5- Motivo da Inscrição no Centro de Formação:', marginL, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('(preenchimento obrigatório)', marginL + 78, y);
  y = drawRuledParagraph(y + 7.5, 2, 32, dados.motivo_inscricao);

  // 5.1 Curso ou área de formação pretendida pelo Candidato
  y += 6.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('5.1 Curso ou área de formação pretendida pelo Candidato', marginL, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('(preenchimento obrigatório)', marginL + 95, y);

  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('1ª Opção', marginL, y);
  const textoOpcao1 = dados.curso_nome
    ? `${dados.curso_nome}${dados.programa_nome ? ` — ${dados.programa_nome}` : ''}${
        dados.curso_local ? ` (${dados.curso_local})` : ''
      }`
    : '';
  drawUnderlinedValue(marginL + 15, rightEdge - 40, y + 0.4, textoOpcao1, {
    bold: true,
  });

  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('2ª Opção', marginL, y);
  const textoOpcao2 = dados.curso_opcao_2_nome
    ? `${dados.curso_opcao_2_nome}${
        dados.curso_opcao_2_programa ? ` — ${dados.curso_opcao_2_programa}` : ''
      }`
    : '';
  drawUnderlinedValue(marginL + 15, rightEdge - 40, y + 0.4, textoOpcao2);

  // Rodapé da Página 1
  drawOfficialFooter('1/2');

  // ============================================================================
  // PÁGINA 2 (2/2) — SERVIÇOS, SITUAÇÃO DE EMPREGO, CASOS ESPECIAIS E PROGRAMA
  // ============================================================================
  doc.addPage();
  drawOfficialHeader();

  // Título Sublinhado: A PREENCHER PELOS SERVIÇOS
  let y2 = 46;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const tituloServicos = 'A PREENCHER PELOS SERVIÇOS';
  doc.text(tituloServicos, pageWidth / 2, y2, { align: 'center' });
  const wServ = doc.getTextWidth(tituloServicos);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line((pageWidth - wServ) / 2, y2 + 0.8, (pageWidth + wServ) / 2, y2 + 0.8);

  // Helper para desenhar linha com pontilhado e caixa de seleção [ ] à direita
  const drawDottedCheckboxRow = (
    labelLeft: string,
    xStartText: number,
    yRow: number,
    checked: boolean,
    boxX = 165,
    boxW = 6.5,
    boxH = 3.2
  ) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(labelLeft, xStartText, yRow);

    const textW = doc.getTextWidth(labelLeft);
    const dotsStartX = xStartText + textW + 1.5;
    const dotsEndX = boxX - 3.5;

    if (dotsEndX > dotsStartX) {
      doc.setLineDashPattern([0.4, 1.1], 0);
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.25);
      doc.line(dotsStartX, yRow - 0.3, dotsEndX, yRow - 0.3);
      doc.setLineDashPattern([], 0);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.28);
    doc.rect(boxX, yRow - boxH + 0.4, boxW, boxH);

    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(greenR, greenG, greenB);
      doc.text('X', boxX + boxW / 2, yRow + 0.1, { align: 'center' });
    }
  };

  // 6 – Situação do Candidato perante o Emprego
  y2 = 57.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.8);
  doc.setTextColor(0, 0, 0);
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

  // 1. Candidato à Procura do 1º Emprego
  y2 += 5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('1.', marginL, y2);
  drawDottedCheckboxRow(
    'Candidato à Procura do 1º Emprego',
    marginL + 6.5,
    y2,
    isPrimeiroEmprego
  );

  // 2. Desempregado à procura de Novo Emprego
  y2 += 4.8;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('2.', marginL, y2);
  drawDottedCheckboxRow(
    'Desempregado à procura de Novo Emprego',
    marginL + 6.5,
    y2,
    isNovoEmprego
  );

  // Actividade profissional anterior : _____
  y2 += 4.8;
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('Actividade profissional anterior :', marginL + 6.5, y2);
  const ativAnterior =
    dados.atividade_profissional_anterior ||
    (isNovoEmprego ? dados.experiencia_profissional || dados.ocupacao : '');
  drawUnderlinedValue(marginL + 49, 134, y2 + 0.4, ativAnterior, { fontSize: 8.5 });

  // 3. Empregado/Activo
  y2 += 4.8;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('3.', marginL, y2);
  drawDottedCheckboxRow('Empregado/Activo', marginL + 6.5, y2, isEmpregadoActivo);

  // Empregado com horário reduzido
  y2 += 4.8;
  drawDottedCheckboxRow(
    'Empregado com horário reduzido',
    marginL + 6.5,
    y2,
    isHorarioReduzido
  );

  // Função que exerce : _____ desde _____
  y2 += 4.8;
  doc.setFont('times', 'normal');
  doc.setFontSize(8.8);
  doc.text('Função que exerce :', marginL + 6.5, y2);
  const funcaoVal =
    dados.funcao_exerce ||
    (isEmpregadoActivo || isHorarioReduzido ? dados.ocupacao : '');
  drawUnderlinedValue(marginL + 33.5, 111, y2 + 0.4, funcaoVal, { fontSize: 8.5 });
  doc.text('desde', 111.5, y2);
  drawUnderlinedValue(120, 151, y2 + 0.4, dados.funcao_desde || '', {
    fontSize: 8.5,
    align: 'center',
  });

  // 4. Profissão _____
  y2 += 4.8;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('4.', marginL, y2);
  doc.text('Profissão', marginL + 6.5, y2);
  drawUnderlinedValue(
    marginL + 21,
    136,
    y2 + 0.4,
    dados.profissao || (!isEstudante ? dados.ocupacao : ''),
    { fontSize: 9 }
  );

  // 5. Estudante
  y2 += 4.8;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('5.', marginL, y2);
  drawDottedCheckboxRow('Estudante', marginL + 6.5, y2, isEstudante);

  // Nível de Escolaridade.......
  y2 += 4.8;
  doc.setFont('times', 'normal');
  doc.setFontSize(8.8);
  doc.text('Nível de Escolaridade', marginL + 6.5, y2);
  doc.setLineDashPattern([0.4, 1.1], 0);
  doc.line(marginL + 36, y2 - 0.2, 115, y2 - 0.2);
  doc.setLineDashPattern([], 0);
  if (dados.habilitacao) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      doc.splitTextToSize(dados.habilitacao, 75)[0] || '',
      marginL + 37.5,
      y2 - 0.8
    );
  }

  // 7- Casos Especiais: (preenchimento obrigatório)
  y2 = 114;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('7- Casos Especiais:', marginL, y2);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.8);
  doc.text('(preenchimento obrigatório)', marginL + 32, y2);

  y2 += 4.8;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('Deficiente', marginL, y2);
  drawUnderlinedValue(
    marginL + 15.5,
    marginL + 25.5,
    y2 + 0.4,
    dados.possui_caso_especial === 'Sim' ? 'Sim' : 'Não',
    { align: 'center', fontSize: 8.5 }
  );
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text(', Encaminhado por Instituição de Apoio Social :', marginL + 26, y2);
  drawUnderlinedValue(
    marginL + 91.5,
    marginL + 99.5,
    y2 + 0.4,
    dados.encaminhado_apoio_social || 'Não',
    { align: 'center', fontSize: 8.5 }
  );
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('Qual:', marginL + 100, y2);
  const qualCasoTexto =
    dados.instituicao_apoio_social ||
    (dados.possui_caso_especial === 'Sim' ? dados.casos_especiais : '');
  drawUnderlinedValue(marginL + 108.5, rightEdge - 2, y2 + 0.4, qualCasoTexto, {
    fontSize: 8.5,
  });

  y2 += 4.8;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('Encaminhado por outra instituição: Qual', marginL, y2);
  drawUnderlinedValue(
    marginL + 56.5,
    rightEdge - 2,
    y2 + 0.4,
    dados.encaminhado_outra_instituicao || '',
    { fontSize: 8.5 }
  );

  // SITUAÇÃO DA CANDIDATURA
  y2 = 148;
  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  const tituloSitCand = 'SITUAÇÃO DA CANDIDATURA';
  doc.text(tituloSitCand, pageWidth / 2, y2, { align: 'center' });
  const wSit = doc.getTextWidth(tituloSitCand);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line((pageWidth - wSit) / 2, y2 + 0.9, (pageWidth + wSit) / 2, y2 + 0.9);

  // 8 – O candidato ficou inscrito no CURSO: _____
  y2 = 162.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text('8 – O candidato ficou inscrito no CURSO:', marginL, y2);

  const cursoInscritoLinha1 = dados.curso_nome || '';
  const cursoInscritoLinha2 = [
    dados.curso_local ? `Local: ${dados.curso_local}` : '',
    dados.curso_horario ? `Horário: ${dados.curso_horario}` : '',
    dados.curso_acao ? `Ação: ${dados.curso_acao}` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');

  drawUnderlinedValue(marginL + 68.5, 173, y2 + 0.4, cursoInscritoLinha1, {
    bold: true,
    fontSize: 9.5,
  });
  y2 += 6.2;
  drawUnderlinedValue(marginL + 71.5, 175.5, y2 + 0.4, cursoInscritoLinha2, {
    fontSize: 8.8,
  });

  // PROGRAMA
  y2 = 177.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
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

  y2 += 4.8;
  listaProgramasOficiais.forEach((itemProg) => {
    const marcado = verificarProgramaSelecionado(dados, itemProg.chave);
    drawDottedCheckboxRow(itemProg.label, marginL, y2, marcado, 168, 6.5, 3.1);
    y2 += 4.5;
  });

  // 9. – Caso seja selecionado, permitirá que seus dados sejam divulgados? Sim___Não___
  y2 = 216.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(0, 0, 0);
  doc.text(
    '9. – Caso seja selecionado, permitirá que seus dados sejam divulgados? Sim',
    marginL,
    y2
  );
  const autorizaSim = (dados.autoriza_divulgacao_dados || 'Sim') === 'Sim';
  drawUnderlinedValue(
    marginL + 104,
    marginL + 114,
    y2 + 0.4,
    autorizaSim ? 'X' : '',
    { align: 'center', bold: true }
  );
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('Não', marginL + 114.5, y2);
  drawUnderlinedValue(
    marginL + 120.5,
    marginL + 131,
    y2 + 0.4,
    !autorizaSim ? 'X' : '',
    { align: 'center', bold: true }
  );

  // Recebido por & Assinatura do Candidato(a)
  y2 = 229.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(0, 0, 0);
  doc.text('Recebido por: :................................................', marginL, y2);
  doc.text('Assinatura do Candidato(a)', 133, y2);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(125, y2 + 9.5, 174, y2 + 9.5);

  // Linha divisória inferior antes da Nota
  y2 = 246;
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.22);
  doc.line(marginL, y2, rightEdge - 2, y2);

  // Nota obrigatória
  y2 = 256.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(0, 0, 0);
  doc.text('Nota:', marginL, y2);
  doc.setFont('times', 'normal');
  doc.text('Deve-se anexar à ficha de inscrição,', marginL + 7.2, y2);
  doc.setFont('times', 'bold');
  doc.text('OBRIGATÓRIAMENTE,', marginL + 46.8, y2);
  doc.setFont('times', 'normal');
  doc.text(
    'a fotocópia do Bilhete de Identidade e fotocópia de Cartão de Identificação Fiscal e cópia',
    marginL + 75.5,
    y2
  );
  doc.text(
    'Certificado de Habilitações Literárias(autenticada) e carta ou declaração de serviço para inscritos que trabalham.',
    marginL,
    y2 + 4.5
  );

  // Rodapé da Página 2
  drawOfficialFooter('2/2');

  // Guardar / Baixar o ficheiro PDF
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
