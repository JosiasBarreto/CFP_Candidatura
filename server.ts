import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import * as XLSX from 'xlsx';
import { createServer as createViteServer } from 'vite';
import { obterCursosOficiais } from './src/server/cursosRepository';
import {
  listarProgramasAtivos,
  listarCursosAtivos,
  CandidaturaCreateSchema,
  CandidaturaService,
  CandidaturaServiceError,
  serializarCandidatura,
  gerarPdfCandidaturaBuffer,
  autenticarUtilizador,
  obterUtilizadorPorHeader,
  isUtilizadorAutorizadoAdmin,
  TABELA_NIVEL_ACESSO,
} from './src/server/candidaturaService';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB por ficheiro
    files: 8,
  },
});

// Middleware auxiliar de autenticação de cabeçalho Bearer
function obterUtilizadorRequisicao(req: Request) {
  const authHeader = req.headers.authorization || '';
  return obterUtilizadorPorHeader(authHeader);
}

// ============================================================================
// ROUTER DA API DO PORTAL DO CANDIDATO & SERVIÇOS CFP-STP (/api)
// ============================================================================
const apiRouter = express.Router();

// --- 1. CATÁLOGO DE PROGRAMAS E CURSOS ---
apiRouter.get('/programas', async (_req: Request, res: Response) => {
  try {
    const programas = await listarProgramasAtivos();
    return res.status(200).json(programas);
  } catch (e: any) {
    return res.status(500).json({ erro: e.message || 'Erro ao listar programas.' });
  }
});

apiRouter.get('/cursos', async (req: Request, res: Response) => {
  try {
    const progIdRaw = req.query.programa_id;
    const progId = progIdRaw && !isNaN(Number(progIdRaw)) ? Number(progIdRaw) : undefined;
    const cursos = await listarCursosAtivos(progId);
    return res.status(200).json(cursos);
  } catch (e: any) {
    return res.status(500).json({ erro: e.message || 'Erro ao listar cursos.' });
  }
});

// --- 2. SUBMISSÃO DE CANDIDATURA ONLINE (ACESSO LIVRE SEM LOGIN) ---
apiRouter.post('/candidaturas', upload.any(), async (req: Request, res: Response) => {
  try {
    const dados: Record<string, any> = { ...(req.body || {}) };

    if (dados.programa_id) dados.programa_id = Number(dados.programa_id);
    if (dados.curso_opcao1_id) dados.curso_opcao1_id = Number(dados.curso_opcao1_id);
    if (dados.curso_id && !dados.curso_opcao1_id) {
      dados.curso_opcao1_id = Number(dados.curso_id);
    }
    if (
      dados.curso_opcao2_id &&
      String(dados.curso_opcao2_id) !== '0' &&
      String(dados.curso_opcao2_id) !== '' &&
      String(dados.curso_opcao2_id) !== 'null' &&
      String(dados.curso_opcao2_id) !== 'NaN'
    ) {
      dados.curso_opcao2_id = Number(dados.curso_opcao2_id);
    } else {
      dados.curso_opcao2_id = null;
    }
    if (dados.ano) dados.ano = Number(dados.ano);
    if (dados.deficiente !== undefined) {
      dados.deficiente = ['true', '1', 'on', 'sim'].includes(
        String(dados.deficiente).toLowerCase()
      );
    }
    if (dados.encaminhado_apoio_social !== undefined) {
      dados.encaminhado_apoio_social = ['true', '1', 'on', 'sim'].includes(
        String(dados.encaminhado_apoio_social).toLowerCase()
      );
    }
    if (dados.autorizacao_divulgacao_dados !== undefined) {
      dados.autorizacao_divulgacao_dados = ['true', '1', 'on', 'sim'].includes(
        String(dados.autorizacao_divulgacao_dados).toLowerCase()
      );
    }

    const [valido, erros] = CandidaturaCreateSchema.validar(dados);
    if (!valido) {
      return res.status(400).json({
        erro: 'Erro de validação dos dados da candidatura.',
        detalhes: erros,
      });
    }

    // Cria imediatamente no estado PENDENTE com protocolo oficial CAND-2026-XXXX
    const candidatura = await CandidaturaService.criar_candidatura(dados, undefined);

    // Anexar ficheiros enviados no mesmo request multipart
    const filesList = (req.files as Express.Multer.File[]) || [];
    for (const fileObj of filesList) {
      if (fileObj && fileObj.originalname) {
        const chave = fileObj.fieldname.toLowerCase();
        let tipo = 'OUTRO';
        if (chave.includes('foto')) tipo = 'FOTO';
        else if (chave.includes('bi')) tipo = 'BI';
        else if (chave.includes('nif')) tipo = 'NIF';
        else if (chave.includes('habilitacao')) tipo = 'CERTIFICADO_HABILITACOES';
        else if (chave.includes('profis')) tipo = 'CERTIFICADO_PROFISSIONAL';

        await CandidaturaService.adicionar_documento({
          candidatura_id: candidatura.id,
          tipo,
          buffer: fileObj.buffer,
          nome_original: fileObj.originalname,
          mime_type: fileObj.mimetype,
          observacao: `Anexo enviado pelo candidato (${fileObj.fieldname})`,
        });
      }
    }

    const serializada = await serializarCandidatura(candidatura, true);

    const dadosInscricaoFormatados = {
      protocolo: candidatura.codigo,
      numero_inscricao: candidatura.codigo.replace('CAND-', ''),
      numero_processo: `CFP${candidatura.bi.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`,
      ano: candidatura.ano || 2026,
      nome: candidatura.nome,
      sexo: candidatura.sexo,
      datanascimento: candidatura.data_nascimento,
      idade: String(candidatura.idade || 22),
      bi: candidatura.bi,
      arquivo_identificacao: candidatura.arquivo_identificacao || 'São Tomé',
      nif: candidatura.nif || '',
      estado_civil: candidatura.estado_civil || 'Solteiro(a)',
      nacionalidade: candidatura.nacionalidade || 'Santomense',
      naturalidade: candidatura.naturalidade || 'São Tomé',
      nome_pai: candidatura.nome_pai || '',
      nome_mae: candidatura.nome_mae || '',
      distrito: candidatura.distrito,
      morada: candidatura.morada || '',
      agregado_familiar: candidatura.agregado || '1',
      telefone: candidatura.contacto,
      telefone2: candidatura.contacto_alternativo || '',
      email: candidatura.email || '',
      ocupacao: candidatura.ocupacao || candidatura.situacao_emprego || '',
      habilitacao: candidatura.habilitacao_literaria,
      formacao_profissional: candidatura.formacao_profissional || '',
      experiencia_profissional: candidatura.experiencia_profissional || '',
      situacao_emprego: candidatura.situacao_emprego || 'primeiro_emprego',
      possui_caso_especial: candidatura.deficiente ? 'Sim' : 'Não',
      casos_especiais: candidatura.tipo_deficiencia || '',
      encaminhado_apoio_social: candidatura.encaminhado_apoio_social ? 'Sim' : 'Não',
      instituicao_apoio_social: candidatura.instituicao_apoio_social || '',
      encaminhado_outra_instituicao: '',
      programa_id: candidatura.programa_id,
      programa_nome: serializada.programa?.nome || 'Programa de Formação Profissional',
      curso_id: candidatura.curso_opcao1_id,
      curso_nome: serializada.curso_opcao1?.nome || '',
      curso_opcao_2_nome: serializada.curso_opcao2?.nome || '—',
      motivo_inscricao: candidatura.motivo_inscricao,
      data_inscricao: candidatura.data_criacao.substring(0, 10),
      autoriza_divulgacao_dados: candidatura.autorizacao_divulgacao_dados ? 'Sim' : 'Não',
    };

    return res.status(201).json({
      mensagem:
        'Candidatura registada com sucesso! A ficha de inscrição preenchida está disponível para download.',
      codigo: candidatura.codigo,
      candidatura_id: candidatura.id,
      estado: candidatura.estado,
      ficha_download_url: `/api/candidaturas/${candidatura.id}/ficha-inscricao?download=true`,
      excel_download_url: `/api/candidaturas/${candidatura.id}/excel`,
      dados_inscricao: dadosInscricaoFormatados,
      candidatura: serializada,
    });
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(500).json({
      erro: `Erro ao registar candidatura: ${e.message || String(e)}`,
    });
  }
});

// --- 3. CONSULTA PÚBLICA DE ESTADO DA CANDIDATURA (POR BI OU CÓDIGO) ---
apiRouter.get('/candidaturas/consultar', async (req: Request, res: Response) => {
  try {
    const bi = String(req.query.bi || '').trim().toUpperCase();
    const codigo = String(req.query.codigo || '').trim().toUpperCase();

    if (!bi && !codigo) {
      return res.status(400).json({
        erro: 'Informe o Bilhete de Identidade (BI) ou o Código da Candidatura para efetuar a consulta.',
      });
    }

    const todas = await CandidaturaService.listar_candidaturas({});
    const filtradas = todas.items.filter((c: any) => {
      if (codigo && String(c.codigo).toUpperCase().includes(codigo)) return true;
      if (bi && (String(c.bi).toUpperCase().includes(bi) || String(c.nif) === bi)) return true;
      return false;
    });

    if (filtradas.length === 0) {
      return res.status(404).json({
        erro: 'Nenhuma candidatura encontrada com os dados informados.',
      });
    }

    return res.status(200).json({
      total: filtradas.length,
      candidaturas: filtradas,
    });
  } catch (e: any) {
    return res.status(500).json({ erro: e.message || 'Erro ao consultar candidatura.' });
  }
});

// --- 4. DOWNLOAD / VISUALIZAÇÃO DA FICHA DE INSCRIÇÃO OFICIAL EM PDF (2 PÁGINAS) ---
apiRouter.get('/candidaturas/:id/ficha-inscricao', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { buffer, codigo } = await gerarPdfCandidaturaBuffer(id);
    const asAttachment = String(req.query.download || 'true').toLowerCase() === 'true';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${asAttachment ? 'attachment' : 'inline'}; filename="ficha_inscricao_cfp_${codigo}.pdf"`
    );
    return res.status(200).send(buffer);
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(404).json({ erro: e.message || 'Ficha de inscrição não encontrada.' });
  }
});

// --- 5. EXPORTAR CANDIDATURA INDIVIDUAL PARA EXCEL ---
apiRouter.get('/candidaturas/:id/excel', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cand = await CandidaturaService.obter_candidatura(id);
    const serializada = await serializarCandidatura(cand, true);

    const linhaCompativel = [
      {
        Protocolo: cand.codigo,
        Nome: cand.nome,
        Sexo: cand.sexo,
        'Data de Nascimento': cand.data_nascimento,
        Idade: cand.idade,
        'Nº BI': cand.bi,
        'Arquivo de Identificação': cand.arquivo_identificacao,
        NIF: cand.nif,
        'Estado Civil': cand.estado_civil,
        Nacionalidade: cand.nacionalidade,
        Naturalidade: cand.naturalidade,
        'Nome do Pai': cand.nome_pai,
        'Nome da Mãe': cand.nome_mae,
        Distrito: cand.distrito,
        'Morada (Residência)': cand.morada,
        'Agregado Familiar': cand.agregado,
        'Telefone (Cont.)': cand.contacto,
        'Telefone Alternativo': cand.contacto_alternativo,
        Email: cand.email,
        Ocupação: cand.ocupacao,
        'Habilitações Literárias': cand.habilitacao_literaria,
        'Formação Profissional': cand.formacao_profissional,
        'Experiência Profissional': cand.experiencia_profissional,
        'Situação Perante Emprego': cand.situacao_emprego,
        'Casos Especiais': cand.deficiente ? cand.tipo_deficiencia || 'Sim' : 'Não',
        Programa: serializada.programa?.nome || 'CFP-STP',
        'Curso 1ª Opção': serializada.curso_opcao1?.nome || '',
        'Curso 2ª Opção': serializada.curso_opcao2?.nome || '—',
        'Motivo da Inscrição': cand.motivo_inscricao,
        'Data Inscrição': cand.data_criacao.substring(0, 10),
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(linhaCompativel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscricao');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="candidatura_${cand.codigo}.xlsx"`
    );
    return res.status(200).send(buffer);
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(404).json({ erro: e.message || 'Erro ao exportar candidatura.' });
  }
});

// --- 6. DETALHES DE CANDIDATURA ---
apiRouter.get('/candidaturas/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cand = await CandidaturaService.obter_candidatura(id);
    const serializada = await serializarCandidatura(cand, true);
    return res.status(200).json(serializada);
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(404).json({ erro: e.message });
  }
});

// --- 7. DOCUMENTOS ANEXOS ---
apiRouter.get('/candidaturas/:id/documentos', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cand = await CandidaturaService.obter_candidatura(id);
    const full = await serializarCandidatura(cand, true);
    return res.status(200).json({
      total: full.documentos.length,
      documentos: full.documentos,
    });
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(404).json({ erro: e.message });
  }
});

// --- 8. AUTENTICAÇÃO E OPERAÇÕES ADMINISTRATIVAS (RBAC) ---
apiRouter.get('/nivel-acesso', (_req: Request, res: Response) => {
  return res.status(200).json(TABELA_NIVEL_ACESSO);
});

apiRouter.get('/niveis-acesso', (_req: Request, res: Response) => {
  return res.status(200).json(TABELA_NIVEL_ACESSO);
});

apiRouter.get('/admin/nivel-acesso', (_req: Request, res: Response) => {
  return res.status(200).json(TABELA_NIVEL_ACESSO);
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { identificador, username, password } = req.body || {};
    const idLogin = identificador || username;
    const resultado = autenticarUtilizador(idLogin, password);
    if (!resultado) {
      return res.status(401).json({
        erro: 'Credenciais inválidas. Verifique o utilizador e a palavra-passe.',
      });
    }
    return res.status(200).json({
      token: resultado.token,
      utilizador: resultado.utilizador,
    });
  } catch (e: any) {
    return res.status(500).json({ erro: e.message || 'Erro ao efetuar login.' });
  }
});

apiRouter.post('/admin/candidaturas/:id/aprovar', async (req: Request, res: Response) => {
  try {
    const user = obterUtilizadorRequisicao(req);
    if (!isUtilizadorAutorizadoAdmin(user)) {
      return res.status(401).json({ erro: 'Acesso não autorizado. Faça login como secretaria/admin.' });
    }
    const id = Number(req.params.id);
    const obs = req.body?.observacao || 'Candidatura aprovada pela secretaria.';
    const aprovada = await CandidaturaService.aprovar_candidatura(id, obs, user!);
    return res.status(200).json({
      mensagem: 'Candidatura aprovada com sucesso!',
      resultado: aprovada,
    });
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(500).json({ erro: e.message });
  }
});

apiRouter.post('/admin/candidaturas/:id/iniciar-analise', async (req: Request, res: Response) => {
  try {
    const user = obterUtilizadorRequisicao(req);
    if (!isUtilizadorAutorizadoAdmin(user)) {
      return res.status(401).json({ erro: 'Acesso não autorizado.' });
    }
    const id = Number(req.params.id);
    const cand = await CandidaturaService.iniciar_analise(id, user!);
    return res.status(200).json({
      mensagem: 'Análise técnica iniciada com sucesso.',
      candidatura: await serializarCandidatura(cand, true),
    });
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(500).json({ erro: e.message });
  }
});

apiRouter.post('/admin/candidaturas/:id/devolver', async (req: Request, res: Response) => {
  try {
    const user = obterUtilizadorRequisicao(req);
    if (!isUtilizadorAutorizadoAdmin(user)) {
      return res.status(401).json({ erro: 'Acesso não autorizado.' });
    }
    const id = Number(req.params.id);
    const motivo = req.body?.motivo || req.body?.motivo_devolucao;
    const cand = await CandidaturaService.devolver_candidatura(id, motivo, user!);
    return res.status(200).json({
      mensagem: 'Candidatura devolvida para correção.',
      candidatura: await serializarCandidatura(cand, true),
    });
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(500).json({ erro: e.message });
  }
});

apiRouter.post('/admin/candidaturas/:id/rejeitar', async (req: Request, res: Response) => {
  try {
    const user = obterUtilizadorRequisicao(req);
    if (!isUtilizadorAutorizadoAdmin(user)) {
      return res.status(401).json({ erro: 'Acesso não autorizado.' });
    }
    const id = Number(req.params.id);
    const motivo = req.body?.motivo || req.body?.motivo_rejeicao;
    const cand = await CandidaturaService.rejeitar_candidatura(id, motivo, user!);
    return res.status(200).json({
      mensagem: 'Candidatura rejeitada.',
      candidatura: await serializarCandidatura(cand, true),
    });
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(500).json({ erro: e.message });
  }
});

apiRouter.put('/admin/candidaturas/:id', async (req: Request, res: Response) => {
  try {
    const user = obterUtilizadorRequisicao(req);
    if (!isUtilizadorAutorizadoAdmin(user)) {
      return res.status(401).json({ erro: 'Acesso não autorizado.' });
    }
    const id = Number(req.params.id);
    const editada = await CandidaturaService.atualizar_candidatura(id, req.body || {}, user!);
    return res.status(200).json({
      mensagem: 'Candidatura atualizada com sucesso pela secretaria.',
      candidatura: await serializarCandidatura(editada, true),
    });
  } catch (e: any) {
    if (e instanceof CandidaturaServiceError) {
      return res.status(e.status_code).json(e.to_dict());
    }
    return res.status(500).json({ erro: e.message });
  }
});

apiRouter.get('/admin/candidaturas/exportar-excel', async (req: Request, res: Response) => {
  try {
    const user = obterUtilizadorRequisicao(req);
    if (!isUtilizadorAutorizadoAdmin(user)) {
      return res.status(401).json({ erro: 'Acesso não autorizado.' });
    }
    const estado = req.query.estado ? String(req.query.estado) : undefined;
    const pesquisa = req.query.pesquisa ? String(req.query.pesquisa) : undefined;

    const lista = await CandidaturaService.listar_candidaturas({ estado, pesquisa });
    const linhas = lista.items.map((c: any) => ({
      ID: c.id,
      Protocolo: c.codigo,
      Estado: c.estado,
      Nome: c.nome,
      BI: c.bi,
      NIF: c.nif,
      Distrito: c.distrito,
      Contacto: c.contacto,
      Programa: c.programa?.nome || '',
      'Curso 1ª Opção': c.curso_opcao1?.nome || '',
      'Curso 2ª Opção': c.curso_opcao2?.nome || '—',
      'Data Criação': c.data_criacao,
    }));

    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidaturas');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="candidaturas_cfp_stp.xlsx"');
    return res.status(200).send(buffer);
  } catch (e: any) {
    return res.status(500).json({ erro: e.message || 'Erro ao exportar lista em Excel.' });
  }
});

app.use('/api', apiRouter);

// Endpoint de catálogo direto
app.post('/curso/busca', async (req: Request, res: Response) => {
  try {
    const cursos = await obterCursosOficiais(req.body || {});
    res.status(200).json(cursos);
  } catch {
    res.status(500).json({
      mensagem: 'Não foi possível carregar a lista de cursos neste momento.',
    });
  }
});

app.use((_err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    sucesso: false,
    erro: 'Ocorreu um erro inesperado no servidor. Por favor, tente novamente.',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CFP-STP Portal do Candidato online on http://localhost:${PORT}`);
  });
}

startServer();

