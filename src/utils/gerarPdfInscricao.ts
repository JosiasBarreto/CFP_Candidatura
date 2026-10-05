import { jsPDF } from 'jspdf';
import { DadosInscricaoFormando, calcularIdade } from './securityAndValidation';
import { obterLogosEmDataUrl } from './pdfLogos';

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
 * Função de Geração de PDF Refatorada
 * - Margens de impressão padrão de 18mm (15mm-20mm)
 * - Cabeçalho: Exclusivamente o Logo CFP-STP (tamanho reduzido e compacto)
 * - Rodapé: Ordem exata:
 *     1. República Portuguesa (Esquerda)
 *     2. IEFP (Centro)
 *     3. Cooperação Portuguesa (Direita)
 * - Hierarquia tipográfica:
 *     Rótulos/Labels em BOLD
 *     Dados preenchidos em REGULAR
 * - Ponto 5.1 e todo o conteúdo da Página 1 posicionados bem acima do rodapé (folga > 50mm)
 * - Área de Instruções de Preenchimento/Nota removida conforme instrução
 */
export const gerarPdfFormularioInscricao = async (
  dados: DadosInscricaoFormando
): Promise<void> => {
  const logos = await obterLogosEmDataUrl(true);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginL = 18; // Margem Esquerda (18mm)
  const marginR = 18; // Margem Direita (18mm)
  const rightEdge = pageWidth - marginR; // 192mm

  const greenR = 26;
  const greenG = 128;
  const greenB = 38;

  // Helper: Cabeçalho com EXCLUSIVAMENTE o Logo CFP-STP (Reduzido)
  const drawOfficialHeader = () => {
    const cx = pageWidth / 2; // 105mm

    // 1. Logo do Cabeçalho = CFPSTP.svg (tamanho compacto reduzido ~10mm x 10mm)
    if (logos.cfpStp) {
      try {
        doc.addImage(logos.cfpStp, 'PNG', cx - 5, 9, 10, 10);
      } catch (_e) {
        // Fallback gráfico
      }
    } else {
      doc.setDrawColor(greenR, greenG, greenB);
      doc.setFillColor(greenR, greenG, greenB);
      doc.setLineWidth(0.6);
      doc.line(cx - 3.5, 10, cx, 13);
      doc.line(cx, 13, cx + 3.5, 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.text('CFP-STP', cx, 15, { align: 'center' });
    }

    // Título Institucional Oficial do Cabeçalho
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(greenR, greenG, greenB);
    doc.text(
      'CENTRO DE FORMAÇÃO PROFISSIONAL DE SÃO TOMÉ E PRÍNCIPE',
      cx,
      23.5,
      { align: 'center' }
    );
  };

  // Helper: Rodapé Institucional com Ordem Exata dos Logos:
  // Esquerda: República Portuguesa | Centro: IEFP | Direita: Cooperação Portuguesa
  const drawOfficialFooter = (paginaTexto: '1/2' | '2/2') => {
    const footerLineY = 266;

    // Linha superior do rodapé
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.25);
    doc.line(marginL, footerLineY, rightEdge, footerLineY);

    // Indicador de Página
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 70, 85);
    doc.text(`Página ${paginaTexto}`, marginL, footerLineY - 1.5);

    const logoY = footerLineY + 2.5;

    // 1. ESQUERDA: República Portuguesa (Republica protuguesa.svg) - Reduzido e elegante (~18mm x 7.5mm)
    if (logos.republicaPortuguesa) {
      try {
        doc.addImage(logos.republicaPortuguesa, 'PNG', marginL, logoY, 18, 7.5);
      } catch (_e) {
        // Fallback
      }
    }

    // 2. CENTRO: IEFP (IEFP__Logo_.svg) - Reduzido e elegante (~16mm x 6.5mm)
    const midX = 105;
    if (logos.iefp) {
      try {
        doc.addImage(logos.iefp, 'PNG', midX - 8, logoY + 0.5, 16, 6.5);
      } catch (_e) {
        // Fallback
      }
    }

    // 3. DIREITA: Cooperação Portuguesa (cooperacao-prtuguesa.svg) - Reduzido (~15mm x 5.5mm)
    const cooperacaoLogoW = 15;
    const cooperacaoLogoH = 5.5;
    const rightLogoX = rightEdge - cooperacaoLogoW;

    if (logos.cooperacaoPortuguesa) {
      try {
        doc.addImage(
          logos.cooperacaoPortuguesa,
          'PNG',
          rightLogoX,
          logoY + 1,
          cooperacaoLogoW,
          cooperacaoLogoH
        );
      } catch (_e) {
        // Fallback
      }
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
      // DADOS PREENCHIDOS = PESO REGULAR
      doc.setFont('times', options?.bold ? 'bold' : 'normal');
      doc.setFontSize(options?.fontSize || 10.5);
      doc.setTextColor(tr, tg, tb);
      const maxW = Math.max(6, xEnd - xStart - 2);
      const textoCortado = doc.splitTextToSize(value.trim(), maxW)[0] || '';

      if (options?.align === 'center') {
        doc.text(textoCortado, (xStart + xEnd) / 2, yLine - 0.7, { align: 'center' });
      } else {
        doc.text(textoCortado, xStart + 1, yLine - 0.7);
      }
    }
  };

  // Helper para desenhar Rótulos/Labels em PESO BOLD
  const drawLabel = (
    text: string,
    x: number,
    y: number,
    fontSize = 9,
    fontFamily: 'times' | 'helvetica' = 'times'
  ) => {
    // LABELS = PESO BOLD
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    doc.text(text, x, y);
    return x + doc.getTextWidth(text) + 1.2;
  };

  // ============================================================================
  // PÁGINA 1 (1/2) — COMPACTA E PERFEITAMENTE AJUSTADA ACIMA DO RODAPÉ
  // ============================================================================
  drawOfficialHeader();

  // Faixa verde central: FICHA DE INSCRIÇÃO DO FORMANDO
  const badgeW = 66;
  const badgeH = 5;
  const badgeX = (pageWidth - badgeW) / 2;
  const badgeY = 27.5;
  doc.setFillColor(greenR, greenG, greenB);
  doc.rect(badgeX, badgeY, badgeW, badgeH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(255, 255, 255);
  doc.text('FICHA DE INSCRIÇÃO DO FORMANDO', pageWidth / 2, badgeY + 3.6, {
    align: 'center',
  });

  // Moldura da FOTO 3x4 (Direita) - Compacta (25mm x 31mm)
  const photoX = rightEdge - 26;
  const photoY = 34.5;
  const photoW = 26;
  const photoH = 31;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.28);
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
        photoX + 0.5,
        photoY + 0.5,
        photoW - 1,
        photoH - 1
      );
    } catch {
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text('FOTO 3x4', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('FOTO 3x4', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  // Metadados Superiores à Esquerda
  const seqNum = obterNumeroSequencia(dados);
  const dataInsc = extrairPartesData(dados.data_inscricao);
  const numProc = obterNumeroProcesso(dados);

  let y = 38.5;
  drawLabel('N.º de Inscrição:', marginL, y, 8.8, 'helvetica');
  doc.setTextColor(greenR, greenG, greenB);
  drawUnderlinedValue(marginL + 28, marginL + 60, y + 0.4, seqNum, {
    lineColor: [greenR, greenG, greenB],
    textColor: [15, 23, 42],
    align: 'center',
    bold: true,
  });

  y += 6.5;
  drawLabel('Data de Inscrição', marginL, y, 8, 'helvetica');
  drawUnderlinedValue(marginL + 25, marginL + 35, y + 0.3, dataInsc.dia, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('/', marginL + 35.8, y);
  drawUnderlinedValue(marginL + 37, marginL + 47, y + 0.3, dataInsc.mes, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });
  doc.text('/', marginL + 47.8, y);
  drawUnderlinedValue(marginL + 49, marginL + 60, y + 0.3, dataInsc.ano, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
  });

  y += 6.5;
  drawLabel('N.º DE PROCESSO:', marginL, y, 7.5, 'helvetica');
  drawUnderlinedValue(marginL + 28, marginL + 60, y + 0.3, numProc, {
    lineColor: [greenR, greenG, greenB],
    align: 'center',
    fontSize: 8.2,
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('(seq/mês/ano)', marginL + 61.5, y);

  // Secção 1 - Identificação do Candidato
  y = 63;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(greenR, greenG, greenB);
  doc.text('1 - Identificação do Candidato:', marginL, y);

  const lineStep = 8.2; // Espaçamento compacto reduzido para caber tudo folgadamente
  y = 69.5;

  // Nome:
  let lx = drawLabel('Nome:', marginL, y, 8.8);
  drawUnderlinedValue(lx, rightEdge, y + 0.3, dados.nome);

  // Filiação: Pai
  y += lineStep;
  lx = drawLabel('Filiação: Pai', marginL, y, 8.8);
  drawUnderlinedValue(lx, rightEdge, y + 0.3, dados.nome_pai);

  // Mãe
  y += lineStep;
  lx = drawLabel('Mãe', marginL + 12, y, 8.8);
  drawUnderlinedValue(lx, rightEdge, y + 0.3, dados.nome_mae);

  // N.º de B.I.: _____ Arq. Ident. _____
  y += lineStep;
  lx = drawLabel('N.º de B.I.:', marginL, y, 8.8);
  drawUnderlinedValue(lx, marginL + 70, y + 0.3, dados.bi);
  lx = drawLabel('Arq. Ident.', marginL + 72, y, 8.8);
  drawUnderlinedValue(lx, rightEdge, y + 0.3, dados.arquivo_identificacao);

  // Nº de Identificação Fiscal _____
  y += lineStep;
  lx = drawLabel('Nº de Identificação Fiscal', marginL, y, 8.8);
  drawUnderlinedValue(lx, marginL + 74, y + 0.3, dados.nif);

  // Data de Nascimento ___/___/___. Sexo _____ Idade _____
  y += lineStep;
  const dn = extrairPartesData(dados.datanascimento);
  lx = drawLabel('Data de Nascimento', marginL, y, 8.8);

  drawUnderlinedValue(lx, lx + 9, y + 0.3, dn.dia, { align: 'center' });
  doc.text('/', lx + 9.5, y);
  drawUnderlinedValue(lx + 11, lx + 20, y + 0.3, dn.mes, { align: 'center' });
  doc.text('/', lx + 20.5, y);
  drawUnderlinedValue(lx + 22, lx + 37, y + 0.3, dn.ano, { align: 'center', fontSize: 8.8 });

  lx = drawLabel('Sexo', lx + 34, y, 8.8);
  drawUnderlinedValue(lx, lx + 28, y + 0.3, dados.sexo);

  lx = drawLabel('Idade', lx + 30, y, 8.8);
  let idadeTexto = '';
  const idCalc = dados.datanascimento ? calcularIdade(dados.datanascimento) : null;
  if (idCalc !== null && idCalc >= 0) {
    idadeTexto = `${idCalc} anos`;
  } else if (dados.idade && !isNaN(Number(dados.idade)) && Number(dados.idade) > 0) {
    idadeTexto = `${dados.idade} anos`;
  }
  drawUnderlinedValue(lx, rightEdge, y + 0.3, idadeTexto);

  // Nacionalidade: _____ Local de Nascimento _____
  y += lineStep;
  lx = drawLabel('Nacionalidade:', marginL, y, 8.8);
  drawUnderlinedValue(lx, marginL + 68, y + 0.3, dados.nacionalidade);
  lx = drawLabel('Local de Nascimento', marginL + 70, y, 8.8);
  drawUnderlinedValue(lx, rightEdge, y + 0.3, dados.naturalidade);

  // Estado Civil: _____ N.º pessoas do agregado familiar : _____
  y += lineStep;
  lx = drawLabel('Estado Civil:', marginL, y, 8.8);
  drawUnderlinedValue(lx, marginL + 68, y + 0.3, dados.estado_civil);
  lx = drawLabel('N.º pessoas do agregado familiar :', marginL + 70, y, 8.8);
  drawUnderlinedValue(lx, rightEdge, y + 0.3, dados.agregado_familiar, { align: 'center' });

  // Morada: _____ Distrito: _____
  y += lineStep;
  lx = drawLabel('Morada:', marginL, y, 8.8);
  drawUnderlinedValue(lx, marginL + 96, y + 0.3, dados.morada);
  lx = drawLabel('Distrito:', marginL + 98, y, 8.8);
  drawUnderlinedValue(lx, rightEdge, y + 0.3, dados.distrito);

  // Contacto telefónico: _____
  y += lineStep;
  lx = drawLabel('Contacto telefónico:', marginL, y, 8.8);
  const contactosTexto = [
    dados.telefone,
    dados.telefone2 ? `Alt: ${dados.telefone2}` : '',
    dados.email ? `Email: ${dados.email}` : '',
  ]
    .filter(Boolean)
    .join('   |   ');
  drawUnderlinedValue(lx, rightEdge, y + 0.3, contactosTexto);

  // Ocupação: _____
  y += lineStep;
  lx = drawLabel('Ocupação:', marginL, y, 8.8);
  drawUnderlinedValue(lx, rightEdge, y + 0.3, dados.ocupacao);

  // 2 –Habilitações Literárias (concluídas) : _____ (Com área em parênteses se não ultrapassar a linha)
  y += 9;
  drawLabel('2 –Habilitações Literárias', marginL, y, 9.2);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('(concluídas) :', marginL + 42, y);

  const areaFormacao = dados.habilitacao_area?.trim();
  const habilitaTextoCompleto = areaFormacao
    ? `${dados.habilitacao} (${areaFormacao})`
    : dados.habilitacao;

  drawUnderlinedValue(marginL + 63, rightEdge, y + 0.3, habilitaTextoCompleto);

  // Helper para desenhar parágrafos pautados
  const drawRuledParagraph = (
    yFirstLine: number,
    numLines: number,
    textValue?: string
  ): number => {
    const fullW = rightEdge - marginL;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const linhasTexto = textValue?.trim()
      ? doc.splitTextToSize(textValue.trim(), fullW - 4)
      : [];

    let curY = yFirstLine;
    for (let i = 0; i < numLines; i++) {
      drawUnderlinedValue(marginL, rightEdge, curY, linhasTexto[i] || '');
      curY += 5.8;
    }
    return curY;
  };

  // 3 –Formação Profissional (2 linhas)
  y += 8.5;
  drawLabel('3 –Formação Profissional', marginL, y, 9.2);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(
    '(Se já frequentou algum Curso de formação diga o curso, local , duração e data conclusão)',
    marginL + 40,
    y
  );
  y = drawRuledParagraph(y + 5, 2, dados.formacao_profissional);

  // 4- Experiência Profissional (2 linhas)
  y += 3;
  drawLabel('4- Experiência Profissional', marginL, y, 9.2);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(
    '(Se já trabalhou refira local de trabalho, funções exercidas e tempo de serviço).',
    marginL + 42,
    y
  );
  y = drawRuledParagraph(y + 5, 2, dados.experiencia_profissional);

  // 5- Motivo da Inscrição no Centro de Formação: (2 linhas)
  y += 3;
  drawLabel('5- Motivo da Inscrição no Centro de Formação:', marginL, y, 9.2);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 40, 40);
  doc.text('(preenchimento obrigatório)', marginL + 72, y);
  y = drawRuledParagraph(y + 5, 2, dados.motivo_inscricao);

  // 5.1 Curso ou área de formação pretendida pelo Candidato
  y += 4;
  drawLabel('5.1 Curso ou área de formação pretendida pelo Candidato', marginL, y, 9.2);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 40, 40);
  doc.text('(preenchimento obrigatório)', marginL + 88, y);

  y += 5;
  lx = drawLabel('1ª Opção', marginL, y, 8.8);
  const textoOpcao1 = dados.curso_nome
    ? `${dados.curso_nome}${dados.programa_nome ? ` — ${dados.programa_nome}` : ''}${
        dados.curso_local ? ` (${dados.curso_local})` : ''
      }`
    : '';
  drawUnderlinedValue(lx, rightEdge, y + 0.3, textoOpcao1);

  y += 5;
  lx = drawLabel('2ª Opção', marginL, y, 8.8);
  const textoOpcao2 = dados.curso_opcao_2_nome
    ? `${dados.curso_opcao_2_nome}${
        dados.curso_opcao_2_programa ? ` — ${dados.curso_opcao_2_programa}` : ''
      }`
    : '';
  drawUnderlinedValue(lx, rightEdge, y + 0.3, textoOpcao2);

  // O PONTO 5.1 TERMINA AQUI (y ~ 212mm), COM MAIS DE 50mm DE FOLGA TOTALMENTE LIVRES ANTES DO RODAPÉ (266mm)!
  drawOfficialFooter('1/2');

  // ============================================================================
  // PÁGINA 2 (2/2) — SERVIÇOS, SITUAÇÃO DE EMPREGO, CASOS ESPECIAIS E PROGRAMA
  // ============================================================================
  doc.addPage();
  drawOfficialHeader();

  // Título Sublinhado: A PREENCHER PELOS SERVIÇOS
  let y2 = 38;
  doc.setFont('times', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(0, 0, 0);
  const tituloServicos = 'A PREENCHER PELOS SERVIÇOS';
  doc.text(tituloServicos, pageWidth / 2, y2, { align: 'center' });
  const wServ = doc.getTextWidth(tituloServicos);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line((pageWidth - wServ) / 2, y2 + 0.8, (pageWidth + wServ) / 2, y2 + 0.8);

  // Helper para desenhar linha pontilhada e caixa de seleção [ ]
  const drawDottedCheckboxRow = (
    labelLeft: string,
    xStartText: number,
    yRow: number,
    checked: boolean,
    boxX = rightEdge - 8,
    boxW = 6,
    boxH = 3
  ) => {
    // LABELS EM PESO BOLD
    doc.setFont('times', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(0, 0, 0);
    doc.text(labelLeft, xStartText, yRow);

    const textW = doc.getTextWidth(labelLeft);
    const dotsStartX = xStartText + textW + 1.5;
    const dotsEndX = boxX - 3;

    if (dotsEndX > dotsStartX) {
      doc.setLineDashPattern([0.4, 1.1], 0);
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.25);
      doc.line(dotsStartX, yRow - 0.3, dotsEndX, yRow - 0.3);
      doc.setLineDashPattern([], 0);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.rect(boxX, yRow - boxH + 0.4, boxW, boxH);

    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(greenR, greenG, greenB);
      doc.text('X', boxX + boxW / 2, yRow + 0.1, { align: 'center' });
    }
  };

  // 6 – Situação do Candidato perante o Emprego
  y2 = 47;
  drawLabel('6 – Situação do Candidato perante o Emprego', marginL, y2, 9.5);

  const sitEmp = (dados.situacao_emprego || '').toLowerCase();
  const isPrimeiroEmprego =
    sitEmp.includes('1º emprego') || sitEmp.includes('1.º emprego') || sitEmp.includes('primeiro_emprego');
  const isNovoEmprego = sitEmp.includes('novo emprego') || sitEmp.includes('novo_emprego');
  const isEmpregadoActivo =
    (sitEmp.includes('empregado') || sitEmp.includes('trabalhador') || sitEmp.includes('activo')) &&
    !sitEmp.includes('desempregado') &&
    !sitEmp.includes('reduzido');
  const isHorarioReduzido = sitEmp.includes('reduzido');
  const isEstudante = sitEmp.includes('estudante');

  // 1. Candidato à Procura do 1º Emprego
  y2 += 4.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('1.', marginL, y2);
  drawDottedCheckboxRow(
    'Candidato à Procura do 1º Emprego',
    marginL + 6,
    y2,
    isPrimeiroEmprego
  );

  // 2. Desempregado à procura de Novo Emprego
  y2 += 4.2;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('2.', marginL, y2);
  drawDottedCheckboxRow(
    'Desempregado à procura de Novo Emprego',
    marginL + 6,
    y2,
    isNovoEmprego
  );

  // Actividade profissional anterior : _____
  y2 += 4.2;
  lx = drawLabel('Actividade profissional anterior :', marginL + 6, y2, 8.2);
  const ativAnterior =
    dados.atividade_profissional_anterior ||
    (isNovoEmprego ? dados.experiencia_profissional || dados.ocupacao : '');
  drawUnderlinedValue(lx, rightEdge - 15, y2 + 0.3, ativAnterior, { fontSize: 8 });

  // 3. Empregado/Activo
  y2 += 4.2;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('3.', marginL, y2);
  drawDottedCheckboxRow('Empregado/Activo', marginL + 6, y2, isEmpregadoActivo);

  // Empregado com horário reduzido
  y2 += 4.2;
  drawDottedCheckboxRow(
    'Empregado com horário reduzido',
    marginL + 6,
    y2,
    isHorarioReduzido
  );

  // Função que exerce : _____ desde _____
  y2 += 4.2;
  lx = drawLabel('Função que exerce :', marginL + 6, y2, 8.2);
  const funcaoVal =
    dados.funcao_exerce ||
    (isEmpregadoActivo || isHorarioReduzido ? dados.ocupacao : '');
  drawUnderlinedValue(lx, marginL + 88, y2 + 0.3, funcaoVal, { fontSize: 8 });

  lx = drawLabel('desde', marginL + 90, y2, 8.2);
  drawUnderlinedValue(lx, rightEdge - 15, y2 + 0.3, dados.funcao_desde || '', {
    fontSize: 8,
    align: 'center',
  });

  // 4. Profissão _____
  y2 += 4.2;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('4.', marginL, y2);
  lx = drawLabel('Profissão', marginL + 6, y2, 8.8);
  drawUnderlinedValue(
    lx,
    rightEdge - 15,
    y2 + 0.3,
    dados.profissao || (!isEstudante ? dados.ocupacao : ''),
    { fontSize: 8.2 }
  );

  // 5. Estudante
  y2 += 4.2;
  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.text('5.', marginL, y2);
  drawDottedCheckboxRow('Estudante', marginL + 6, y2, isEstudante);

  // Nível de Escolaridade.......
  y2 += 4.2;
  lx = drawLabel('Nível de Escolaridade', marginL + 6, y2, 8.2);
  doc.setLineDashPattern([0.4, 1.1], 0);
  doc.line(lx, y2 - 0.2, rightEdge - 15, y2 - 0.2);
  doc.setLineDashPattern([], 0);
  if (dados.habilitacao) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text(
      doc.splitTextToSize(dados.habilitacao, 85)[0] || '',
      lx + 2,
      y2 - 0.8
    );
  }

  // 7- Casos Especiais:
  y2 = 96;
  drawLabel('7- Casos Especiais:', marginL, y2, 9.5);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 40, 40);
  doc.text('(preenchimento obrigatório)', marginL + 32, y2);

  y2 += 4.2;
  lx = drawLabel('Deficiente', marginL, y2, 8.2);
  drawUnderlinedValue(
    lx,
    lx + 12,
    y2 + 0.3,
    dados.possui_caso_especial === 'Sim' ? 'Sim' : 'Não',
    { align: 'center', fontSize: 8 }
  );

  lx = drawLabel(', Encaminhado por Instituição de Apoio Social :', lx + 14, y2, 8.2);
  drawUnderlinedValue(
    lx,
    lx + 12,
    y2 + 0.3,
    dados.encaminhado_apoio_social || 'Não',
    { align: 'center', fontSize: 8 }
  );

  lx = drawLabel('Qual:', lx + 14, y2, 8.2);
  const qualCasoTexto =
    dados.instituicao_apoio_social ||
    (dados.possui_caso_especial === 'Sim' ? dados.casos_especiais : '');
  drawUnderlinedValue(lx, rightEdge, y2 + 0.3, qualCasoTexto, {
    fontSize: 8,
  });

  y2 += 4.2;
  lx = drawLabel('Encaminhado por outra instituição: Qual', marginL, y2, 8.2);
  drawUnderlinedValue(
    lx,
    rightEdge,
    y2 + 0.3,
    dados.encaminhado_outra_instituicao || '',
    { fontSize: 8 }
  );

  // SITUAÇÃO DA CANDIDATURA
  y2 = 122;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const tituloSitCand = 'SITUAÇÃO DA CANDIDATURA';
  doc.text(tituloSitCand, pageWidth / 2, y2, { align: 'center' });
  const wSit = doc.getTextWidth(tituloSitCand);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line((pageWidth - wSit) / 2, y2 + 0.8, (pageWidth + wSit) / 2, y2 + 0.8);

  // 8 – O candidato ficou inscrito no CURSO: _____
  y2 = 133;
  lx = drawLabel('8 – O candidato ficou inscrito no CURSO:', marginL, y2, 9.2);

  const cursoInscritoLinha1 = dados.curso_nome || '';
  const cursoInscritoLinha2 = [
    dados.curso_local ? `Local: ${dados.curso_local}` : '',
    dados.curso_horario ? `Horário: ${dados.curso_horario}` : '',
    dados.curso_acao ? `Ação: ${dados.curso_acao}` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');

  drawUnderlinedValue(lx, rightEdge, y2 + 0.3, cursoInscritoLinha1, {
    fontSize: 8.8,
  });
  y2 += 5;
  drawUnderlinedValue(marginL + 20, rightEdge, y2 + 0.3, cursoInscritoLinha2, {
    fontSize: 8.2,
  });

  // PROGRAMA
  y2 = 146;
  drawLabel('PROGRAMA', marginL, y2, 9.2);

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

  y2 += 4;
  listaProgramasOficiais.forEach((itemProg) => {
    const marcado = verificarProgramaSelecionado(dados, itemProg.chave);
    drawDottedCheckboxRow(itemProg.label, marginL, y2, marcado, rightEdge - 8, 6, 2.8);
    y2 += 3.8;
  });

  // 9. – Caso seja selecionado, permitirá que seus dados sejam divulgados?
  y2 = 181;
  lx = drawLabel(
    '9. – Caso seja selecionado, permitirá que seus dados sejam divulgados? Sim',
    marginL,
    y2,
    8.2
  );
  const autorizaSim = (dados.autoriza_divulgacao_dados || 'Sim') === 'Sim';
  drawUnderlinedValue(
    lx,
    lx + 10,
    y2 + 0.3,
    autorizaSim ? 'X' : '',
    { align: 'center', bold: true }
  );

  lx = drawLabel('Não', lx + 12, y2, 8.2);
  drawUnderlinedValue(
    lx,
    lx + 10,
    y2 + 0.3,
    !autorizaSim ? 'X' : '',
    { align: 'center', bold: true }
  );

  // Recebido por & Assinatura do Candidato(a)
  y2 = 195;
  drawLabel('Recebido por: :................................................', marginL, y2, 8.2);
  drawLabel('Assinatura do Candidato(a)', rightEdge - 48, y2, 8.2);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(rightEdge - 52, y2 + 8, rightEdge - 5, y2 + 8);

  // Rodapé da Página 2 (Sem a Área de Instruções de Preenchimento / Nota conforme instrução)
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
