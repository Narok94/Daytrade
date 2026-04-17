import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'secret-fallback-for-dev-only';

// Import handlers from /handlers
import loginHandler from "./handlers/login.js";
import registerHandler from "./handlers/register.js";
import getDataHandler from "./handlers/get-data.js";
import saveDataHandler from "./handlers/save-data.js";
import healthCheckHandler from "./handlers/health-check.js";
import setupHandler from "./handlers/setup.js";
import aiAnalysisHandler from "./handlers/ai-analysis.js";
import setupAdminHandler from "./handlers/setup-admin.js";

// Admin handlers from /handlers/admin
import getAdminUsersHandler from "./handlers/admin/get-users.js";
import togglePauseHandler from "./handlers/admin/toggle-pause.js";
import updateSystemSettingsHandler from "./handlers/admin/update-system-settings.js";
import getSystemSettingsHandler from "./handlers/admin/get-system-settings.js";
import resetPasswordHandler from "./handlers/admin/reset-password.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  console.log('Servidor iniciado com sucesso: Iniciando boot do app...');
  const app = express();

  app.use(express.json());

  // Middleware to authenticate JWT token
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
      }
      req.user = user;
      next();
    });
  };

  // Helper to wrap Vercel handlers for Express
  const wrapHandler = (handler: any, requiresAuth: boolean = false) => async (req: any, res: any) => {
    console.log(`[API START] ${req.method} ${req.url}`);
    try {
      if (requiresAuth && !req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      if (req.user) {
        (req as any).auth = req.user;
      }

      await handler(req, res);
    } catch (error: any) {
      console.error("API Error:", error);
      
      const isConnError = error.message.toLowerCase().includes('connect') || 
                         error.message.toLowerCase().includes('connection') ||
                         error.message.toLowerCase().includes('pool');
      
      const status = isConnError ? 500 : (res.statusCode === 200 ? 500 : res.statusCode);
      const message = isConnError ? "Erro de Conexão com o Banco" : (error.message || 'Erro interno no servidor');
      
      if (!res.headersSent) {
        res.status(status).json({ error: message, details: error.message });
      }
    }
  };

  // API routes
  app.post("/api/login", wrapHandler(loginHandler));
  app.post("/api/register", wrapHandler(registerHandler));
  app.get("/api/get-data", authenticateToken, wrapHandler(getDataHandler, true));
  app.post("/api/save-data", authenticateToken, wrapHandler(saveDataHandler, true));
  app.post("/api/ai-analysis", authenticateToken, wrapHandler(aiAnalysisHandler, true));
  app.get("/api/health-check", wrapHandler(healthCheckHandler));
  app.get("/api/setup", wrapHandler(setupHandler));
  app.get("/api/setup-admin", wrapHandler(setupAdminHandler));
  
  // Admin routes
  app.get("/api/admin/get-users", authenticateToken, wrapHandler(getAdminUsersHandler, true));
  app.post("/api/admin/toggle-pause", authenticateToken, wrapHandler(togglePauseHandler, true));
  app.post("/api/admin/update-system-settings", authenticateToken, wrapHandler(updateSystemSettingsHandler, true));
  app.get("/api/admin/get-system-settings", authenticateToken, wrapHandler(getSystemSettingsHandler, true));
  app.post("/api/admin/reset-password", authenticateToken, wrapHandler(resetPasswordHandler, true));

  // Vite/Static logic
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/:any*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  console.log('--- Rotas mapeadas e servidor pronto para receber conexões ---');
  return app;
}

// Support for Vercel (Monolithic entry point)
const appPromise = createServer();

export default async (req: any, res: any) => {
  console.log(`Recebendo requisição: ${req.method} ${req.url}`);
  const app = await appPromise;
  return app(req, res);
};

// Support for local development
if (process.env.NODE_ENV !== "production" || process.env.RUN_LOCAL === 'true') {
  const PORT = 3000;
  appPromise.then(app => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  });
}
