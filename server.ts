import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3000;

// URL da API Flask do Utilizador (127.0.0.1:5000 / 192.168.100.141:5000)
const FLASK_BACKEND_URL =
  process.env.FLASK_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'http://127.0.0.1:5000';

console.log(`[CFP-STP Proxy] Encaminhando todas as requisições para a API Flask em: ${FLASK_BACKEND_URL}`);

// Proxy reverso para a API Flask oficial
const flaskProxy = createProxyMiddleware({
  target: FLASK_BACKEND_URL,
  changeOrigin: true,
  ws: false,
  on: {
    error: (err: Error, _req: any, res: any) => {
      console.error(
        `[CFP-STP Proxy] Erro de comunicação com o Flask (${FLASK_BACKEND_URL}):`,
        err.message
      );
      if (res && typeof res.status === 'function' && !res.headersSent) {
        res.status(502).json({
          sucesso: false,
          erro: `Não foi possível ligar ao servidor Flask em ${FLASK_BACKEND_URL}. Certifique-se de que a sua aplicação Flask está em execução na porta 5000.`,
          detalhe: err.message,
        });
      }
    },
  },
});

// Todas as requisições de API são direcionadas diretamente à API Flask
app.use('/api', flaskProxy);
app.use('/curso', flaskProxy);
app.use('/cursos', flaskProxy);
app.use('/programas', flaskProxy);
app.use('/candidaturas', flaskProxy);
app.use('/nivel-acesso', flaskProxy);
app.use('/niveis-acesso', flaskProxy);

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
    console.log(`[CFP-STP] Portal do Candidato online em http://localhost:${PORT}`);
    console.log(`[CFP-STP] Backend Flask conectado em ${FLASK_BACKEND_URL}`);
  });
}

startServer();
