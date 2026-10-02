import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Porta do Frontend: Prioritiza PORT / FRONTEND_PORT ou assume 3002 por padrão
const DEFAULT_PORT = 3002;
const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.FRONTEND_PORT
  ? parseInt(process.env.FRONTEND_PORT, 10)
  : DEFAULT_PORT;

// URL da API Flask do Utilizador (Padrão: 192.168.100.141:5000)
const FLASK_BACKEND_URL =
  'http://192.168.100.141:5000';

console.log(`[CFP-STP Proxy] A encaminhar requisições para a API Flask em: ${FLASK_BACKEND_URL}`);

// Proxy reverso para a API Flask oficial
const flaskProxy = createProxyMiddleware({
  target: FLASK_BACKEND_URL,
  changeOrigin: true,
  ws: false,
  pathRewrite: (path: string) => {
    // Encaminha as rotas exatamente como especificadas na API Flask
    if (path.startsWith('/api/')) return path.replace(/^\/api/, '');
    return path;
  },
  onError: (err: Error, _req: any, res: any) => {
    console.error(`[CFP-STP Proxy] Erro de ligação com Flask (${FLASK_BACKEND_URL}):`, err.message);
    if (res && typeof res.status === 'function' && !res.headersSent) {
      res.status(502).json({
        sucesso: false,
        erro: `Não foi possível ligar ao servidor Flask em ${FLASK_BACKEND_URL}. Certifique-se de que a sua aplicação Flask está em execução na porta 5000.`,
        detalhe: err.message,
      });
    }
  },
  on: {
    error: (err: Error, _req: any, res: any) => {
      console.error(`[CFP-STP Proxy] Erro de ligação com Flask (${FLASK_BACKEND_URL}):`, err.message);
      if (res && typeof res.status === 'function' && !res.headersSent) {
        res.status(502).json({
          sucesso: false,
          erro: `Não foi possível ligar ao servidor Flask em ${FLASK_BACKEND_URL}. Certifique-se de que a sua aplicação Flask está em execução na porta 5000.`,
          detalhe: err.message,
        });
      }
    },
  },
} as any);

// Todas as rotas da API são direcionadas para a API Flask
app.use('/status', flaskProxy);
app.use('/programa', flaskProxy);
app.use('/programas', flaskProxy);
app.use('/curso', flaskProxy);
app.use('/cursos', flaskProxy);
app.use('/candidatura', flaskProxy);
app.use('/candidaturas', flaskProxy);
app.use('/nivel-acesso', flaskProxy);
app.use('/niveis-acesso', flaskProxy);
app.use('/api', flaskProxy);

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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CFP-STP] Servidor Frontend ativo na porta ${PORT}`);
    console.log(`[CFP-STP] Aceda no seu navegador em: http://localhost:${PORT}`);
    console.log(`[CFP-STP] API Flask conectada em: ${FLASK_BACKEND_URL}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const altPort = PORT + 1;
      console.warn(`[CFP-STP] A porta ${PORT} está em uso. A tentar na porta alternativa ${altPort}...`);
      app.listen(altPort, '0.0.0.0', () => {
        console.log(`[CFP-STP] Servidor Frontend ativo na porta alternativa ${altPort}`);
        console.log(`[CFP-STP] Aceda no seu navegador em: http://localhost:${altPort}`);
      });
    } else {
      console.error('[CFP-STP] Erro no servidor Express:', err);
    }
  });
}

startServer();
