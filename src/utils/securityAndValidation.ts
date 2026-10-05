import {
  SEXOS_PERMITIDOS,
  ESTADOS_CIVIS_PERMITIDOS,
  DISTRITOS_PERMITIDOS,
  HABILITACOES_LITERARIAS_CONFIG,
  CursoItem,
} from '../data/cursosData';

export interface AnexoDocumento {
  nomeFicheiro: string;
  nomeInternoSeguro?: string;
  tipoMime: string;
  tamanhoBytes: number;
  dataUrl: string;
  larguraPx?: number;
  alturaPx?: number;
  file?: File;
}

export interface DadosInscricaoFormando {
  // Variáveis compatíveis com o modelo existente (ImportarFormandos)
  id: string;
  protocolo: string;
  nome: string;
  nome_pai: string;
  nome_mae: string;
  bi: string;
  arquivo_identificacao: string;
  nif: string;
  datanascimento: string;
  idade: string;
  sexo: string;
  nacionalidade: string;
  naturalidade: string;
  estado_civil: string;
  agregado_familiar: string;
  morada: string;
  distrito: string;
  telefone: string;
  telefone2: string;
  email: string;
  ocupacao: string;
  // Habilitações Literárias (seleção dependente + campo unificado)
  habilitacao_nivel: string;
  habilitacao_classe: string;
  habilitacao_area: string;
  habilitacao: string;
  // Formação, experiência e motivo (textos curtos controlados)
  formacao_profissional: string;
  experiencia_profissional: string;
  motivo_inscricao: string;
  // Situação perante emprego e casos especiais (Página 2 do Modelo Oficial CFP-STP)
  situacao_emprego: string;
  atividade_profissional_anterior?: string;
  funcao_exerce?: string;
  funcao_desde?: string;
  profissao?: string;
  possui_caso_especial: 'Não' | 'Sim';
  casos_especiais: string;
  encaminhado_apoio_social?: 'Não' | 'Sim';
  instituicao_apoio_social?: string;
  encaminhado_outra_instituicao?: string;
  autoriza_divulgacao_dados?: 'Sim' | 'Não';
  numero_inscricao?: string;
  numero_processo?: string;
  observacao: string;
  // 1.ª Opção: Programa e Curso
  programa_id: string;
  programa_nome: string;
  curso_id: string;
  curso_nome: string;
  curso_acao: string;
  curso_horario: string;
  curso_local: string;
  // 2.ª Opção: Programa e Curso
  programa_opcao_2_id: string;
  curso_opcao_2_id: string;
  curso_opcao_2_nome: string;
  curso_opcao_2_programa: string;
  curso_opcao_2_horario: string;
  curso_opcao_2_local: string;
  // Metadados da inscrição
  ano: string;
  situacao: string;
  data_inscricao: string;
  // Fotografia e Documentos anexados
  foto?: File | null;
  fotoPreview: string;
  fotoDimensoes?: { width: number; height: number } | null;
  doc_bi?: AnexoDocumento | null;
  doc_nif?: AnexoDocumento | null;
  doc_certificado_habilitacao?: AnexoDocumento | null;
  doc_certificado_profissional?: AnexoDocumento | null;
  aceita_declaracao: boolean;
}

// Padrões maliciosos (SQL Injection, XSS, Script Tags, Event Handlers, Path Traversal)
const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /on(load|error|click|mouseover|focus|blur|submit|change|keyup|keydown)\s*=/i,
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|UNION)\b\s+\b(FROM|INTO|TABLE|DATABASE|ALL|SELECT|SET)\b/i,
  /(--|\/\*|\*\/)/,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /\.\.\//,
  /\.\.\\/,
  /\bxp_cmdshell\b/i,
  /\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
];

export const contemPadraoPerigoso = (valor: string): boolean => {
  if (!valor) return false;
  return DANGEROUS_PATTERNS.some((regex) => regex.test(valor));
};

export const sanitizarEntradaSegura = (valor: string, maxLen = 180): string => {
  if (!valor) return '';
  return valor
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/--/g, '-')
    .slice(0, maxLen);
};

export const calcularIdade = (dataNasc?: string): number | null => {
  if (!dataNasc) return null;
  const limpo = dataNasc.split('T')[0].trim();
  let ano = 0;
  let mes = 0;
  let dia = 0;

  if (limpo.includes('-')) {
    const partes = limpo.split('-');
    if (partes.length === 3) {
      if (partes[0].length === 4) {
        // YYYY-MM-DD
        ano = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        dia = parseInt(partes[2], 10);
      } else {
        // DD-MM-YYYY
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        ano = parseInt(partes[2], 10);
      }
    }
  } else if (limpo.includes('/')) {
    const partes = limpo.split('/');
    if (partes.length === 3) {
      if (partes[0].length === 4) {
        // YYYY/MM/DD
        ano = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        dia = parseInt(partes[2], 10);
      } else {
        // DD/MM/YYYY
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        ano = parseInt(partes[2], 10);
      }
    }
  }

  if (!ano || isNaN(ano) || isNaN(mes) || isNaN(dia)) {
    const nasc = new Date(dataNasc);
    if (isNaN(nasc.getTime())) return null;
    ano = nasc.getFullYear();
    mes = nasc.getMonth();
    dia = nasc.getDate();
  }

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() - mes;
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) {
    idade--;
  }
  return idade >= 0 ? idade : null;
};

export const comporHabilitacaoCompleta = (
  nivel: string,
  classe: string,
  area: string
): string => {
  if (!nivel) return '';
  const config = HABILITACOES_LITERARIAS_CONFIG.find((h) => h.id === nivel);
  const areaLimpa = area?.trim();
  if (config?.exigeAreaCurso && areaLimpa) {
    return `${nivel} - ${classe} (${areaLimpa})`;
  }
  if (classe) {
    return `${nivel} (${classe})`;
  }
  return nivel;
};

export const normalizarTelefoneSTP = (telefone: string): string => {
  if (!telefone) return '';
  return telefone.replace(/[^\d+\s-]/g, '').trim().slice(0, 18);
};

export const validarTelefoneSTP = (telefone: string): boolean => {
  if (!telefone) return false;
  const limpo = telefone.replace(/[\s()-]/g, '');
  // Formato São Tomé e Príncipe (7 dígitos começando por 9 ou 2, com ou sem +239 / 00239) ou internacional (7 a 15 dígitos)
  return /^(\+239|00239)?[29]\d{6}$/.test(limpo) || /^\+?[0-9]{7,15}$/.test(limpo);
};

// Determina obrigatoriedade do Certificado de Habilitação Profissional com base no programa_id real (ID = 2: Estágio Profissional)
export const exigeCertificadoProfissionalPorCurso = (
  programaId1: string,
  cursoId1: string,
  cursoOpcao2Id: string,
  cursos: CursoItem[]
): boolean => {
  if (Number(programaId1) === 2) return true;
  if (cursoId1) {
    const c1 = cursos.find((c) => Number(c.id) === Number(cursoId1));
    if (c1 && Number(c1.programa_id) === 2) return true;
  }
  if (cursoOpcao2Id) {
    const c2 = cursos.find((c) => Number(c.id) === Number(cursoOpcao2Id));
    if (c2 && Number(c2.programa_id) === 2) return true;
  }
  return false;
};

// Validação rigorosa de ficheiros no cliente antes do upload (extensão, MIME, assinatura binária e dimensões)
const EXTENSOES_BLOQUEADAS = /\.(exe|bat|cmd|sh|php|pl|py|js|jsp|asp|aspx|dll|msi|vbs|scr|jar|com|pif)$/i;

export const validarFicheiroSeguranca = async (
  file: File,
  tipo: 'foto' | 'documento'
): Promise<{
  valido: boolean;
  erro?: string;
  dimensoes?: { width: number; height: number };
}> => {
  if (!file) return { valido: false, erro: 'Nenhum ficheiro selecionado.' };

  if (EXTENSOES_BLOQUEADAS.test(file.name) || file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valido: false,
      erro: 'Ficheiro rejeitado por segurança: extensão ou nome de ficheiro proibido.',
    };
  }

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) {
    return {
      valido: false,
      erro: 'O ficheiro excede o tamanho máximo permitido de 5 MB.',
    };
  }

  if (file.size < 128) {
    return {
      valido: false,
      erro: 'O ficheiro parece estar vazio ou corrompido.',
    };
  }

  const mimesFoto = ['image/jpeg', 'image/png', 'image/webp'];
  const mimesDoc = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

  if (tipo === 'foto' && !mimesFoto.includes(file.type)) {
    return {
      valido: false,
      erro: 'Formato inválido para fotografia. Utilize apenas JPG, PNG ou WEBP.',
    };
  }

  if (tipo === 'documento' && !mimesDoc.includes(file.type)) {
    return {
      valido: false,
      erro: 'Formato inválido para documento. Utilize apenas PDF, JPG ou PNG.',
    };
  }

  // Verificar assinatura binária (Magic Bytes)
  try {
    const slice = file.slice(0, 8);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isPdf =
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46; // %PDF
    const isWebp =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46; // RIFF

    if (tipo === 'foto' && !(isJpeg || isPng || isWebp)) {
      return {
        valido: false,
        erro: 'O conteúdo real do ficheiro não corresponde a uma imagem válida.',
      };
    }

    if (tipo === 'documento' && !(isPdf || isJpeg || isPng || isWebp)) {
      return {
        valido: false,
        erro: 'O conteúdo real do ficheiro não corresponde a um PDF ou imagem válida.',
      };
    }
  } catch {
    return { valido: false, erro: 'Não foi possível verificar a integridade do ficheiro.' };
  }

  // Se for fotografia, validar dimensões mínimas e máximas
  if (tipo === 'foto') {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (img.width < 120 || img.height < 120) {
          resolve({
            valido: false,
            erro: `Dimensões demasiado reduzidas (${img.width}x${img.height}px). Mínimo exigido: 120x120px.`,
          });
        } else if (img.width > 4500 || img.height > 4500) {
          resolve({
            valido: false,
            erro: `Dimensões excessivas (${img.width}x${img.height}px). Máximo permitido: 4500x4500px.`,
          });
        } else {
          resolve({
            valido: true,
            dimensoes: { width: img.width, height: img.height },
          });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          valido: false,
          erro: 'Não foi possível processar a imagem selecionada.',
        });
      };
      img.src = objectUrl;
    });
  }

  return { valido: true };
};

export const LIMITE_TEXTO_CURTO = 180;
export const LIMITE_AREA_FORMACAO = 100;

export const validarFormularioInscricao = (
  dados: DadosInscricaoFormando,
  cursos: CursoItem[],
  etapa?: number // 1 a 6
): { valido: boolean; erros: Record<string, string> } => {
  const erros: Record<string, string> = {};

  // Verificação global contra XSS e SQL Injection
  const camposTexto: Array<keyof DadosInscricaoFormando> = [
    'nome',
    'nome_pai',
    'nome_mae',
    'bi',
    'arquivo_identificacao',
    'nif',
    'naturalidade',
    'morada',
    'telefone',
    'telefone2',
    'email',
    'ocupacao',
    'habilitacao_area',
    'formacao_profissional',
    'experiencia_profissional',
    'motivo_inscricao',
    'casos_especiais',
  ];

  for (const campo of camposTexto) {
    const val = String(dados[campo] || '');
    if (contemPadraoPerigoso(val)) {
      erros[campo] =
        'Caracteres ou instruções não permitidas por motivos de segurança.';
    }
  }

  const validarEtapa1 = !etapa || etapa === 1;
  const validarEtapa2 = !etapa || etapa === 2;
  const validarEtapa3 = !etapa || etapa === 3;
  const validarEtapa4 = !etapa || etapa === 4;
  const validarEtapa5 = !etapa || etapa === 5;
  const validarEtapa6 = !etapa || etapa === 6;

  // --- ETAPA 1: Dados Pessoais ---
  if (validarEtapa1) {
    const nome = dados.nome.trim();
    if (!nome) {
      erros.nome = 'O nome completo é obrigatório.';
    } else if (nome.length < 5 || nome.length > 120) {
      erros.nome = 'O nome deve ter entre 5 e 120 caracteres.';
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(nome)) {
      erros.nome = 'O nome deve conter apenas letras e espaços.';
    } else if (nome.split(/\s+/).length < 2) {
      erros.nome = 'Indique o nome próprio e apelido.';
    }

    const nomePai = dados.nome_pai.trim();
    if (!nomePai) {
      erros.nome_pai = 'O nome do pai é obrigatório (ou indique "Não declarado").';
    } else if (nomePai.length < 3 || nomePai.length > 120) {
      erros.nome_pai = 'Deve conter entre 3 e 120 caracteres.';
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(nomePai)) {
      erros.nome_pai = 'Apenas letras e espaços são permitidos.';
    }

    const nomeMae = dados.nome_mae.trim();
    if (!nomeMae) {
      erros.nome_mae = 'O nome da mãe é obrigatório.';
    } else if (nomeMae.length < 3 || nomeMae.length > 120) {
      erros.nome_mae = 'Deve conter entre 3 e 120 caracteres.';
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(nomeMae)) {
      erros.nome_mae = 'Apenas letras e espaços são permitidos.';
    }

    const bi = dados.bi.trim();
    if (!bi) {
      erros.bi = 'O número do Bilhete de Identidade / Documento é obrigatório.';
    } else if (!/^[A-Za-z0-9-\/]{5,20}$/.test(bi)) {
      erros.bi = 'Formato inválido (use entre 5 e 20 letras/números).';
    }

    if (!dados.arquivo_identificacao.trim()) {
      erros.arquivo_identificacao = 'Selecione o Arquivo de Identificação.';
    }

    const nif = dados.nif.trim();
    if (!nif) {
      erros.nif = 'O NIF / Nº de Cartão de Contribuinte é obrigatório.';
    } else if (!/^[0-9]{6,15}$/.test(nif)) {
      erros.nif = 'O NIF deve conter apenas algarismos (6 a 15 dígitos).';
    }

    if (!dados.datanascimento) {
      erros.datanascimento = 'A data de nascimento é obrigatória.';
    } else {
      const idade = calcularIdade(dados.datanascimento);
      if (idade === null || idade < 14 || idade > 85) {
        erros.datanascimento = 'A idade deve estar compreendida entre 14 e 85 anos.';
      }
    }

    if (!dados.sexo) {
      erros.sexo = 'Selecione o sexo.';
    } else if (!SEXOS_PERMITIDOS.includes(dados.sexo as any)) {
      erros.sexo = 'Valor inválido. Apenas Masculino ou Feminino.';
    }

    if (!dados.estado_civil) {
      erros.estado_civil = 'Selecione o estado civil.';
    } else if (!ESTADOS_CIVIS_PERMITIDOS.includes(dados.estado_civil as any)) {
      erros.estado_civil = 'Selecione uma opção válida de estado civil.';
    }

    if (!dados.nacionalidade.trim()) {
      erros.nacionalidade = 'Selecione a nacionalidade.';
    }

    const naturalidade = dados.naturalidade.trim();
    if (!naturalidade) {
      erros.naturalidade = 'O local de nascimento é obrigatório.';
    } else if (naturalidade.length < 2 || naturalidade.length > 80) {
      erros.naturalidade = 'Indique um local de nascimento válido (2 a 80 caracteres).';
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s,.'-]+$/.test(naturalidade)) {
      erros.naturalidade = 'Caracteres inválidos no local de nascimento.';
    }

    const agregado = dados.agregado_familiar.trim();
    if (!agregado) {
      erros.agregado_familiar = 'Indique o número do agregado familiar.';
    } else if (!/^[0-9]{1,2}$/.test(agregado) || Number(agregado) < 1 || Number(agregado) > 35) {
      erros.agregado_familiar = 'Indique um número inteiro entre 1 e 35.';
    }
  }

  // --- ETAPA 2: Morada e Contactos ---
  if (validarEtapa2) {
    if (!dados.distrito) {
      erros.distrito = 'Selecione o distrito de residência.';
    } else if (!DISTRITOS_PERMITIDOS.includes(dados.distrito as any)) {
      erros.distrito = 'Selecione um distrito oficial válido.';
    }

    const morada = dados.morada.trim();
    if (!morada) {
      erros.morada = 'A morada / localidade é obrigatória.';
    } else if (morada.length < 3 || morada.length > 120) {
      erros.morada = 'A morada deve ter entre 3 e 120 caracteres.';
    }

    const tel1 = dados.telefone.trim();
    if (!tel1) {
      erros.telefone = 'O contacto telefónico principal é obrigatório.';
    } else if (!validarTelefoneSTP(tel1)) {
      erros.telefone =
        'Formato inválido. Use 7 dígitos (ex: 9912345) ou +239 seguido do número.';
    }

    const tel2 = dados.telefone2.trim();
    if (tel2) {
      if (!validarTelefoneSTP(tel2)) {
        erros.telefone2 = 'O outro contacto telefónico tem formato inválido.';
      } else if (tel2.replace(/\D/g, '') === tel1.replace(/\D/g, '')) {
        erros.telefone2 = 'O segundo contacto deve ser diferente do contacto principal.';
      }
    }

    const email = dados.email.trim();
    if (email) {
      if (email.length > 100 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email)) {
        erros.email = 'Introduza um endereço de email válido.';
      }
    }
  }

  // --- ETAPA 3: Formação Académica, Profissional, Emprego e Casos Especiais ---
  if (validarEtapa3) {
    const configNivel = HABILITACOES_LITERARIAS_CONFIG.find(
      (h) => h.id === dados.habilitacao_nivel
    );
    if (!dados.habilitacao_nivel || !configNivel) {
      erros.habilitacao_nivel = 'Selecione o nível de habilitação literária.';
    } else {
      if (!dados.habilitacao_classe || !configNivel.opcoes.includes(dados.habilitacao_classe)) {
        erros.habilitacao_classe = `Selecione ${configNivel.labelEspecificacao.toLowerCase()}.`;
      }
      if (configNivel.exigeAreaCurso) {
        const area = dados.habilitacao_area.trim();
        if (!area) {
          erros.habilitacao_area =
            'Indique a área/curso de formação (ex: Licenciatura em Engenharia Informática).';
        } else if (area.length < 3 || area.length > LIMITE_AREA_FORMACAO) {
          erros.habilitacao_area = `A área de formação deve ter entre 3 e ${LIMITE_AREA_FORMACAO} caracteres.`;
        } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s,./()-]+$/.test(area)) {
          erros.habilitacao_area = 'A área contém caracteres inválidos.';
        }
      }
    }

    if (!dados.situacao_emprego) {
      erros.situacao_emprego = 'Selecione a situação perante o emprego.';
    }

    const ocupacao = dados.ocupacao.trim();
    if (!ocupacao) {
      erros.ocupacao = 'Indique a ocupação atual.';
    } else if (ocupacao.length < 2 || ocupacao.length > 80) {
      erros.ocupacao = 'A ocupação deve ter entre 2 e 80 caracteres.';
    }

    const formProf = dados.formacao_profissional.trim();
    if (formProf.length > LIMITE_TEXTO_CURTO) {
      erros.formacao_profissional = `Texto demasiado longo (máx. ${LIMITE_TEXTO_CURTO} caracteres).`;
    }

    const expProf = dados.experiencia_profissional.trim();
    if (expProf.length > LIMITE_TEXTO_CURTO) {
      erros.experiencia_profissional = `Texto demasiado longo (máx. ${LIMITE_TEXTO_CURTO} caracteres).`;
    }

    if (dados.possui_caso_especial === 'Sim' && !dados.casos_especiais.trim()) {
      erros.casos_especiais = 'Descreva ou selecione a necessidade/caso especial.';
    }
  }

  // --- ETAPA 4: Seleção de Programa, 1.ª e 2.ª Opção de Curso e Motivo ---
  if (validarEtapa4) {
    if (!dados.programa_id) {
      erros.programa_id = 'Selecione o Programa da 1.ª Opção.';
    }

    if (!dados.curso_id) {
      erros.curso_id = 'Selecione o Curso de 1.ª Opção.';
    } else if (dados.programa_id && cursos.length > 0) {
      const curso1 = cursos.find((c) => Number(c.id) === Number(dados.curso_id));
      if (!curso1 || Number(curso1.programa_id) !== Number(dados.programa_id)) {
        erros.curso_id = 'O curso selecionado não pertence ao programa escolhido.';
      }
    }

    if (dados.curso_opcao_2_id) {
      if (String(dados.curso_opcao_2_id) === String(dados.curso_id)) {
        erros.curso_opcao_2_id =
          'A 2.ª opção não pode ser exatamente o mesmo curso da 1.ª opção.';
      } else if (cursos.length > 0) {
        const curso2 = cursos.find((c) => Number(c.id) === Number(dados.curso_opcao_2_id));
        if (!curso2) {
          erros.curso_opcao_2_id = 'O curso de 2.ª opção selecionado é inválido.';
        } else if (
          dados.programa_opcao_2_id &&
          Number(curso2.programa_id) !== Number(dados.programa_opcao_2_id)
        ) {
          erros.curso_opcao_2_id =
            'O curso de 2.ª opção não corresponde ao programa filtrado.';
        }
      }
    }

    const motivo = dados.motivo_inscricao.trim();
    if (!motivo) {
      erros.motivo_inscricao =
        'Indique o motivo da inscrição no Centro de Formação neste curso.';
    } else if (motivo.length < 10) {
      erros.motivo_inscricao = 'Indique pelo menos 10 caracteres no motivo da inscrição.';
    } else if (motivo.length > LIMITE_TEXTO_CURTO) {
      erros.motivo_inscricao = `O motivo não pode exceder ${LIMITE_TEXTO_CURTO} caracteres.`;
    }
  }

  // --- ETAPA 5: Fotografia e Documentos ---
  if (validarEtapa5) {
    // Os documentos enviados já são validados no momento do upload (assinatura binária, MIME e tamanho).
    // Caso algum documento não seja anexado digitalmente, será registado na ficha PDF para apresentação presencial na Secretaria do CFP-STP.
  }

  // --- ETAPA 6: Revisão e Declaração Final ---
  if (validarEtapa6) {
    if (!dados.aceita_declaracao) {
      erros.aceita_declaracao =
        'Confirme que reviu todos os dados e que as informações prestadas são verdadeiras.';
    }
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros,
  };
};
