import { jsPDF } from 'jspdf';
import { DadosInscricaoFormando } from './securityAndValidation';
import { obterLogosEmDataUrl, LogosDataUrls } from './pdfLogos';

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

/**
 * Função Refatorada para Geração do Documento PDF Oficial
 * - Margens de impressão de 18mm em todas as faces (padrão 15mm - 20mm)
 * - Hierarquia tipográfica rigorosa: Labels em peso SEMIBOLD/BOLD e Dados Preenchidos em REGULAR
 * - Prevenção total de sobreposição com o rodapé institucional em documentos de múltiplas páginas
 * - Renderização dos 4 logos oficiais de assets/logos (CFPSTP, IEFP, República Portuguesa e Cooperação Portuguesa)
 */
export const gerarPdfFormularioInscricao = async (
  dados: DadosInscricaoFormando
): Promise<void> => {
  const logos = await obterLogosEmDataUrl();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Configuração Padrão de Margens de Impressão (18mm)
  const pageWidth = 210;
  const pageHeight = 297;
  const marginL = 18; // Margem Esquerda (18mm)
  const marginR = 18; // Margem Direita (18mm)
  const marginTop = 16; // Margem Superior (16mm)
  const marginBottom = 18; // Margem Inferior (18mm)
  const rightEdge = pageWidth - marginR; // 192mm
  const yContentMax = pageHeight - marginBottom - 15; // 261mm — Conteúdo nunca ultrapassa este limite

  const greenR = 26;
  const greenG = 128;
  const greenB = 38;

  // Helper: Desenha o Cabeçalho Oficial com Logos
  const drawOfficialHeader = () => {
    const cx = pageWidth / 2; // 105mm

    // Logo IEFP à Esquerda
    if (logos.iefp) {
      try {
        doc.addImage(logos.iefp, 'PNG', marginL, marginTop - 2, 22, 11);
      } catch (_e) {
        // Fallback gráfico
      }
    }

    // Logo CFP-STP ao Centro
    if (logos.cfpStp) {
      try {
        doc.addImage(logos.cfpStp, 'PNG', cx - 7.5, marginTop - 4, 15, 15);
      } catch (_e) {
        // Fallback gráfico
      }
    } else {
      // Desenho vetorial reserva do emblema CFP-STP
      doc.setDrawColor(greenR, greenG, greenB);
      doc.setFillColor(greenR, greenG, greenB);
      doc.setLineWidth(0.6);
      doc.line(cx - 4, 12, cx, 15);
      doc.line(cx, 15, cx + 4, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.5);
      doc.setTextColor(greenR, greenG, greenB);
      doc.text('CFP-STP', cx, 17, { align: 'center' });
    }

    // Título Institucional Superior
    doc.setFont('times', 'bold');
    doc.setFontSize(11.8);
    doc.setTextColor(greenR, greenG, greenB);
    doc.text(
      'CENTRO DE FORMAÇÃO PROFISSIONAL DE SÃO TOMÉ E PRÍNCIPE',
      cx,
      marginTop + 14.5,
      { align: 'center' }
    );
  };

  // Helper: Desenha o Rodapé Institucional e Logos Oficiais
  const drawOfficialFooter = (paginaTexto: '1/2' | '2/2') => {
    const footerTopY = 264;

    // Linha divisória de proteção superior ao rodapé
    doc.setDrawColor(210, 214, 220);
    doc.setLineWidth(0.3);
    doc.line(marginL, footerTopY, rightEdge, footerTopY);

    // Indicador de Página
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(50, 60, 75);
    doc.text(paginaTexto, marginL, footerTopY + 4.5);

    const logoY = footerTopY + 6.5;

    // 1. Logo Esquerda: República Portuguesa
    if (logos.republicaPortuguesa) {
      try {
        doc.addImage(logos.republicaPortuguesa, 'PNG', marginL, logoY, 26, 12);
      } catch (_e) {
        // Fallback
      }
    } else {
      doc.setFillColor(204, 34, 41);
      doc.rect(marginL, logoY + 1, 1.6, 4.2, 'F');
      doc.setFillColor(26, 128, 38);
      doc.rect(marginL + 1.6, logoY + 1, 1.4, 4.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(30, 41, 59);
      doc.text('REPÚBLICA PORTUGUESA', marginL + 4, logoY + 3.5);
    }

    // 2. Logo Centro: CFP-STP
    const midX = 105;
    if (logos.cfpStp) {
      try {
        doc.addImage(logos.cfpStp, 'PNG', midX - 6, logoY - 1, 12, 12);
      } catch (_e) {
        // Fallback
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(greenR, greenG, greenB);
    doc.text('R.D. SÃO TOMÉ E PRÍNCIPE', midX, logoY + 12.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.8);
    doc.setTextColor(70, 80, 95);
    doc.text('CENTRO DE FORMAÇÃO PROFISSIONAL', midX, logoY + 14.8, { align: 'center' });

    // 3. Logo Direita: Cooperação Portuguesa
    if (logos.cooperacaoPortuguesa) {
      try {
        doc.addImage(
          logos.cooperacaoPortuguesa,
          'PNG',
          rightEdge - 32,
          logoY,
          32,
          12
        );
      } catch (_e) {
        // Fallback
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.8);
      doc.setTextColor(71, 85, 105);
      doc.text('COOPERAÇÃO PORTUGAL', rightEdge - 28, logoY + 4);
    }
  };

  // Helper para desenhar a linha pautada e o valor preenchido (PESO REGULAR)
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
    const [lr, lg, lb] = options?.lineColor || [140, 140, 140];
    const [tr, tg, tb] = options?.textColor || [15, 23, 42];

    doc.setDrawColor(lr, lg, lb);
    doc.setLineWidth(0.2);
    doc.line(xStart, yLine, xEnd, yLine);

    if (value && value.trim()) {
      // DADOS PREENCHIDOS: PESO REGULAR CONFORME ESPECIFICAÇÃO
      doc.setFont('times', options?.bold ? 'bold' : 'normal');
      doc.setFontSize(options?.fontSize || 9.5);
      doc.setTextColor(tr, tg, tb);
      const maxW = Math.max(6, xEnd - xStart - 2);
      const textoCortado = doc.splitTextToSize(value.trim(), maxW)[0] || '';

      if (options?.align === 'center') {
        doc.text(textoCortado, (xStart + xEnd) / 2, yLine - 0.8, { align: 'center' });
      } else {
        doc.text(textoCortado, xStart + 1.2, yLine - 0.8);
      }
    }
  };

  // Helper para desenhar Rólos/Labels em PESO SEMIBOLD / BOLD
  const drawLabel = (
    text: string,
    x: number,
    y: number,
    fontSize = 9.5,
    fontFamily: 'times' | 'helvetica' = 'times'
  ) => {
    // LABELS POSSUEM PESO SEMIBOLD/BOLD CONFORME ESPECIFICAÇÃO
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    doc.text(text, x, y);
    return x + doc.getTextWidth(text) + 1.5;
  };

  // ============================================================================
  // PÁGINA 1 (1/2) — IDENTIFICAÇÃO, HABILITAÇÕES, FORMAÇÃO, EXPERIÊNCIA E OPÇÕES
  // ============================================================================
  drawOfficialHeader();

  // Faixa verde central: FICHA DE INSCRIÇÃO DO FORMANDO
  const badgeW = 68;
  const badgeH = 5.5;
  const badgeX = (pageWidth - badgeW) / 2;
  const badgeY = 32.5;
  doc.setFillColor(greenR, greenG, greenB);
  doc.rect(badgeX, badgeY, badgeW, badgeH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FICHA DE INSCRIÇÃO DO FORMANDO', pageWidth / 2, badgeY + 4.0, {
    align: 'center',
  });

  // Moldura da FOTO 3x4 (Direita)
  const photoX = rightEdge - 32;
  const photoY = 39.5;
  const photoW = 32;
  const photoH = 40;
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
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('FOTO 3x4', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('FOTO 3x4', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  // Metadados Superiores à Esquerda (em verde)
  const seqNum = obterNumeroSequencia(dados);
  const dataInsc = extrairPartesData(dados.data_inscricao);
  const numProc = obterNumeroProcesso(dados);

  let y = 44.5;
  drawLabel('N.º de Inscrição:', marginL, y, 9.8, 'helvetica');
  doc.setTextColor(greenR, greenG, greenB);
  drawUnderlinedValue(marginL + 33, marginL + 66, y + 0.4, seqNum, {
    lineColor: [greenR, greenG, greenB],
    textColor: [15, 23, 42],
    align: 'center',
    bold: true,
  });

  y += 8.2;
  drawLabel('Data de Inscrição', marginL, y, 8.8, 'helvetica');
  drawUnderlinedValue(marginL + 28, marginL + 39, y + 0.3, dataInsc.dia, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('/', marginL + 39.8, y);
  drawUnderlinedValue(marginL + 41.5, marginL + 52.5, y + 0.3, dataInsc.mes, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });
  doc.text('/', marginL + 53.2, y);
  drawUnderlinedValue(marginL + 55, marginL + 66, y + 0.3, dataInsc.ano, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });

  y += 8;
  drawLabel('N.º DE PROCESSO:', marginL, y, 8.2, 'helvetica');
  drawUnderlinedValue(marginL + 32, marginL + 66, y + 0.3, numProc, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
    fontSize: 9,
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('(seq/mês/ano)', marginL + 67.5, y);

  // Secção 1 - Identificação do Candidato
  y = 75;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('1 - Identificação do Candidato:', marginL, y);

  const lineStep = 6.6;
  y = 87.5;

  // Nome:
  let lx = drawLabel('Nome:', marginL, y, 9.5);
  drawUnderlinedValue(lx, rightEdge, y + 0.4, dados.nome);

  // Filiação: Pai
  y += lineStep;
  lx = drawLabel('Filiação: Pai', marginL, y, 9.5);
  drawUnderlinedValue(lx, rightEdge, y + 0.4, dados.nome_pai);

  // Mãe
  y += lineStep;
  lx = drawLabel('Mãe', marginL + 12.5, y, 9.5);
  drawUnderlinedValue(lx, rightEdge, y + 0.4, dados.nome_mae);

  // N.º de B.I.: _____ Arq. Ident. _____
  y += lineStep;
  lx = drawLabel('N.º de B.I.:', marginL, y, 9.5);
  drawUnderlinedValue(lx, marginL + 76, y + 0.4, dados.bi);
  lx = drawLabel('Arq. Ident.', marginL + 78, y, 9.5);
  drawUnderlinedValue(lx, rightEdge, y + 0.4, dados.arquivo_identificacao);

  // Nº de Identificação Fiscal _____
  y += lineStep;
  lx = drawLabel('Nº de Identificação Fiscal', marginL, y, 9.5);
  drawUnderlinedValue(lx, marginL + 80, y + 0.4, dados.nif);

  // Data de Nascimento ___/___/___. Sexo _____ Idade _____
  y += lineStep;
  const dn = extrairPartesData(dados.datanascimento);
  lx = drawLabel('Data de Nascimento', marginL, y, 9.5);
  drawUnderlinedValue(lx, lx + 10, y + 0.4, dn.dia, { align: 'center' });
  doc.text('/', lx + 10.5, y);
  drawUnderlinedValue(lx + 12, lx + 22, y + 0.4, dn.mes, { align: 'center' });
  doc.text('/', lx + 22.5, y);
  drawUnderlinedValue(lx + 24, lx + 34, y + 0.4, dn.ano, { align: 'center' });

  lx = drawLabel('Sexo', lx + 37, y, 9.5);
  drawUnderlinedValue(lx, lx + 30, y + 0.4, dados.sexo, { align: 'center' });

  lx = drawLabel('Idade', lx + 32, y, 9.5);
  drawUnderlinedValue(
    lx,
    rightEdge,
    y + 0.4,
    dados.idade ? `${dados.idade} anos` : '',
    { align: 'center' }
  );

  // Nacionalidade: _____ Local de Nascimento _____
  y += lineStep;
  lx = drawLabel('Nacionalidade:', marginL, y, 9.5);
  drawUnderlinedValue(lx, marginL + 72, y + 0.4, dados.nacionalidade);
  lx = drawLabel('Local de Nascimento', marginL + 74, y, 9.5);
  drawUnderlinedValue(lx, rightEdge, y + 0.4, dados.naturalidade);

  // Estado Civil: _____ N.º pessoas do agregado familiar : _____
  y += lineStep;
  lx = drawLabel('Estado Civil:', marginL, y, 9.5);
  drawUnderlinedValue(lx, marginL + 72, y + 0.4, dados.estado_civil);
  lx = drawLabel('N.º pessoas do agregado familiar :', marginL + 74, y, 9.5);
  drawUnderlinedValue(lx, rightEdge, y + 0.4, dados.agregado_familiar, {
    align: 'center',
  });

  // Morada: _____ Distrito: _____
  y += lineStep;
  lx = drawLabel('Morada:', marginL, y, 9.5);
  drawUnderlinedValue(lx, marginL + 102, y + 0.4, dados.morada);
  lx = drawLabel('Distrito:', marginL + 104, y, 9.5);
  drawUnderlinedValue(lx, rightEdge, y + 0.4, dados.distrito);

  // Contacto telefónico: _____
  y += lineStep;
  lx = drawLabel('Contacto telefónico:', marginL, y, 9.5);
  const contactosTexto = [
    dados.telefone,
    dados.telefone2 ? `Alt: ${dados.telefone2}` : '',
    dados.email ? `Email: ${dados.email}` : '',
  ]
    .filter(Boolean)
    .join('   |   ');
  drawUnderlinedValue(lx, rightEdge, y + 0.4, contactosTexto);

  // Ocupação: _____
  y += lineStep;
  lx = drawLabel('Ocupação:', marginL, y, 9.5);
  drawUnderlinedValue(lx, rightEdge, y + 0.4, dados.ocupacao);

  // 2 –Habilitações Literárias (concluídas) : _____
  y += 11.5;
  drawLabel('2 –Habilitações Literárias', marginL, y, 10.5);
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('(concluídas) :', marginL + 46, y);
  drawUnderlinedValue(marginL + 67, rightEdge, y + 0.4, dados.habilitacao);

  // Helper para desenhar parágrafos pautados com labels em bold e valores em regular
  const drawRuledParagraph = (
    yFirstLine: number,
    numLines: number,
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
      drawUnderlinedValue(marginL, rightEdge, curY, linhasTexto[i] || '');
      curY += 6.5;
    }
    return curY;
  };

  // 3 –Formação Profissional
  y += 11.5;
  drawLabel('3 –Formação Profissional', marginL, y, 10.5);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(80, 80, 80);
  doc.text(
    '(Se já frequentou algum Curso de formação diga o curso, local , duração e data conclusão)',
    marginL + 44,
    y
  );
  y = drawRuledParagraph(y + 7.2, 3, dados.formacao_profissional);

  // 4- Experiência Profissional
  y += 4.5;
  drawLabel('4- Experiência Profissional', marginL, y, 10.5);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(80, 80, 80);
  doc.text(
    '(Se já trabalhou refira local de trabalho, funções exercidas e tempo de serviço).',
    marginL + 47,
    y
  );
  y = drawRuledParagraph(y + 7.2, 3, dados.experiencia_profissional);

  // 5- Motivo da Inscrição no Centro de Formação:
  y += 4.5;
  drawLabel('5- Motivo da Inscrição no Centro de Formação:', marginL, y, 10.5);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(180, 40, 40);
  doc.text('(preenchimento obrigatório)', marginL + 79, y);
  y = drawRuledParagraph(y + 7.2, 2, dados.motivo_inscricao);

  // 5.1 Curso ou área de formação pretendida pelo Candidato
  y += 5.5;
  drawLabel('5.1 Curso ou área de formação pretendida pelo Candidato', marginL, y, 10.2);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(180, 40, 40);
  doc.text('(preenchimento obrigatório)', marginL + 95, y);

  y += 6.8;
  lx = drawLabel('1ª Opção', marginL, y, 9.5);
  const textoOpcao1 = dados.curso_nome
    ? `${dados.curso_nome}${dados.programa_nome ? ` — ${dados.programa_nome}` : ''}${
        dados.curso_local ? ` (${dados.curso_local})` : ''
      }`
    : '';
  drawUnderlinedValue(lx, rightEdge, y + 0.4, textoOpcao1);

  y += 6.8;
  lx = drawLabel('2ª Opção', marginL, y, 9.5);
  const textoOpcao2 = dados.curso_opcao_2_nome
    ? `${dados.curso_opcao_2_nome}${
        dados.curso_opcao_2_programa ? ` — ${dados.curso_opcao_2_programa}` : ''
      }`
    : '';
  drawUnderlinedValue(lx, rightEdge, y + 0.4, textoOpcao2);

  // Rodapé da Página 1 (garante limite e sem sobreposição)
  drawOfficialFooter('1/2');

  // ============================================================================
  // PÁGINA 2 (2/2) — SERVIÇOS, SITUAÇÃO DE EMPREGO, CASOS ESPECIAIS E PROGRAMA
  // ============================================================================
  doc.addPage();
  drawOfficialHeader();

  // Título Sublinhado: A PREENCHER PELOS SERVIÇOS
  let y2 = 45;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  const tituloServicos = 'A PREENCHER PELOS SERVIÇOS';
  doc.text(tituloServicos, pageWidth / 2, y2, { align: 'center' });
  const wServ = doc.getTextWidth(tituloServicos);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line((pageWidth - wServ) / 2, y2 + 0.8, (pageWidth + wServ) / 2, y2 + 0.8);

  // Helper para desenhar linha pontilhada e caixa de seleção [ ] à direita
  const drawDottedCheckboxRow = (
    labelLeft: string,
    xStartText: number,
    yRow: number,
    checked: boolean,
    boxX = rightEdge - 8,
    boxW = 6.5,
    boxH = 3.2
  ) => {
    // LABELS EM PESO SEMIBOLD/BOLD
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(labelLeft, xStartText, yRow);

    const textW = doc.getTextWidth(labelLeft);
    const dotsStartX = xStartText + textW + 1.5;
    const dotsEndX = boxX - 3.5;

    if (dotsEndX > dotsStartX) {
      doc.setLineDashPattern([0.4, 1.1], 0);
      doc.setDrawColor(120, 120, 120);
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
  y2 = 56;
  drawLabel('6 – Situação do Candidato perante o Emprego', marginL, y2, 10.5);

  const sitEmp = (dados.situacao_emprego || '').toLowerCase();
  const isPrimeiroEmprego = sitEmp.includes('1º emprego') || sitEmp.includes('1.º emprego') || sitEmp.includes('primeiro_emprego');
  const isNovoEmprego = sitEmp.includes('novo emprego') || sitEmp.includes('novo_emprego');
  const isEmpregadoActivo =
    (sitEmp.includes('empregado') || sitEmp.includes('trabalhador') || sitEmp.includes('activo')) &&
    !sitEmp.includes('desempregado') &&
    !sitEmp.includes('reduzido');
  const isHorarioReduzido = sitEmp.includes('reduzido');
  const isEstudante = sitEmp.includes('estudante');

  // 1. Candidato à Procura do 1º Emprego
  y2 += 5.2;
  doc.setFont('times', 'bold');
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
  doc.setFont('times', 'bold');
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
  lx = drawLabel('Actividade profissional anterior :', marginL + 6.5, y2, 8.8);
  const ativAnterior =
    dados.atividade_profissional_anterior ||
    (isNovoEmprego ? dados.experiencia_profissional || dados.ocupacao : '');
  drawUnderlinedValue(lx, rightEdge - 15, y2 + 0.4, ativAnterior, { fontSize: 8.5 });

  // 3. Empregado/Activo
  y2 += 4.8;
  doc.setFont('times', 'bold');
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
  lx = drawLabel('Função que exerce :', marginL + 6.5, y2, 8.8);
  const funcaoVal =
    dados.funcao_exerce ||
    (isEmpregadoActivo || isHorarioReduzido ? dados.ocupacao : '');
  drawUnderlinedValue(lx, marginL + 95, y2 + 0.4, funcaoVal, { fontSize: 8.5 });

  lx = drawLabel('desde', marginL + 97, y2, 8.8);
  drawUnderlinedValue(lx, rightEdge - 15, y2 + 0.4, dados.funcao_desde || '', {
    fontSize: 8.5,
    align: 'center',
  });

  // 4. Profissão _____
  y2 += 4.8;
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('4.', marginL, y2);
  lx = drawLabel('Profissão', marginL + 6.5, y2, 9.5);
  drawUnderlinedValue(
    lx,
    rightEdge - 15,
    y2 + 0.4,
    dados.profissao || (!isEstudante ? dados.ocupacao : ''),
    { fontSize: 9 }
  );

  // 5. Estudante
  y2 += 4.8;
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('5.', marginL, y2);
  drawDottedCheckboxRow('Estudante', marginL + 6.5, y2, isEstudante);

  // Nível de Escolaridade.......
  y2 += 4.8;
  lx = drawLabel('Nível de Escolaridade', marginL + 6.5, y2, 8.8);
  doc.setLineDashPattern([0.4, 1.1], 0);
  doc.line(lx, y2 - 0.2, rightEdge - 15, y2 - 0.2);
  doc.setLineDashPattern([], 0);
  if (dados.habilitacao) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      doc.splitTextToSize(dados.habilitacao, 85)[0] || '',
      lx + 2,
      y2 - 0.8
    );
  }

  // 7- Casos Especiais: (preenchimento obrigatório)
  y2 = 112;
  drawLabel('7- Casos Especiais:', marginL, y2, 10.5);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 40, 40);
  doc.text('(preenchimento obrigatório)', marginL + 35, y2);

  y2 += 4.8;
  lx = drawLabel('Deficiente', marginL, y2, 8.8);
  drawUnderlinedValue(
    lx,
    lx + 12,
    y2 + 0.4,
    dados.possui_caso_especial === 'Sim' ? 'Sim' : 'Não',
    { align: 'center', fontSize: 8.5 }
  );

  lx = drawLabel(', Encaminhado por Instituição de Apoio Social :', lx + 14, y2, 8.8);
  drawUnderlinedValue(
    lx,
    lx + 12,
    y2 + 0.4,
    dados.encaminhado_apoio_social || 'Não',
    { align: 'center', fontSize: 8.5 }
  );

  lx = drawLabel('Qual:', lx + 14, y2, 8.8);
  const qualCasoTexto =
    dados.instituicao_apoio_social ||
    (dados.possui_caso_especial === 'Sim' ? dados.casos_especiais : '');
  drawUnderlinedValue(lx, rightEdge, y2 + 0.4, qualCasoTexto, {
    fontSize: 8.5,
  });

  y2 += 4.8;
  lx = drawLabel('Encaminhado por outra instituição: Qual', marginL, y2, 8.8);
  drawUnderlinedValue(
    lx,
    rightEdge,
    y2 + 0.4,
    dados.encaminhado_outra_instituicao || '',
    { fontSize: 8.5 }
  );

  // SITUAÇÃO DA CANDIDATURA
  y2 = 144;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const tituloSitCand = 'SITUAÇÃO DA CANDIDATURA';
  doc.text(tituloSitCand, pageWidth / 2, y2, { align: 'center' });
  const wSit = doc.getTextWidth(tituloSitCand);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line((pageWidth - wSit) / 2, y2 + 0.9, (pageWidth + wSit) / 2, y2 + 0.9);

  // 8 – O candidato ficou inscrito no CURSO: _____
  y2 = 158;
  lx = drawLabel('8 – O candidato ficou inscrito no CURSO:', marginL, y2, 10.2);

  const cursoInscritoLinha1 = dados.curso_nome || '';
  const cursoInscritoLinha2 = [
    dados.curso_local ? `Local: ${dados.curso_local}` : '',
    dados.curso_horario ? `Horário: ${dados.curso_horario}` : '',
    dados.curso_acao ? `Ação: ${dados.curso_acao}` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');

  drawUnderlinedValue(lx, rightEdge, y2 + 0.4, cursoInscritoLinha1, {
    fontSize: 9.5,
  });
  y2 += 6.2;
  drawUnderlinedValue(marginL + 20, rightEdge, y2 + 0.4, cursoInscritoLinha2, {
    fontSize: 8.8,
  });

  // PROGRAMA
  y2 = 173;
  drawLabel('PROGRAMA', marginL, y2, 10.2);

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
    drawDottedCheckboxRow(itemProg.label, marginL, y2, marcado, rightEdge - 8, 6.5, 3.1);
    y2 += 4.4;
  });

  // 9. – Caso seja selecionado, permitirá que seus dados sejam divulgados? Sim___Não___
  y2 = 212;
  lx = drawLabel(
    '9. – Caso seja selecionado, permitirá que seus dados sejam divulgados? Sim',
    marginL,
    y2,
    8.8
  );
  const autorizaSim = (dados.autoriza_divulgacao_dados || 'Sim') === 'Sim';
  drawUnderlinedValue(
    lx,
    lx + 10,
    y2 + 0.4,
    autorizaSim ? 'X' : '',
    { align: 'center', bold: true }
  );

  lx = drawLabel('Não', lx + 12, y2, 8.8);
  drawUnderlinedValue(
    lx,
    lx + 10,
    y2 + 0.4,
    !autorizaSim ? 'X' : '',
    { align: 'center', bold: true }
  );

  // Recebido por & Assinatura do Candidato(a)
  y2 = 224;
  drawLabel('Recebido por: :................................................', marginL, y2, 8.8);
  drawLabel('Assinatura do Candidato(a)', rightEdge - 50, y2, 8.8);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(rightEdge - 55, y2 + 9, rightEdge - 5, y2 + 9);

  // Linha divisória inferior antes da Nota (garantida bem acima de y = 260mm)
  y2 = 240;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.22);
  doc.line(marginL, y2, rightEdge, y2);

  // Nota obrigatória
  y2 = 248;
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
    y2 + 4.2
  );

  // Rodapé da Página 2 (garante que NUNCA colide com o conteúdo acima)
  drawOfficialFooter('2/2');

  // Guardar e descarregar o PDF
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
