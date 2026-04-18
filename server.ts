import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'secret-fallback-for-dev-only';

// Import handlers
import loginHandler from "./handlers/login.js";
import registerHandler from "./handlers/register.js";
import getDataHandler from "./handlers/get-data.js";
import saveDataHandler from "./handlers/save-data.js";
import healthCheckHandler from "./handlers/health-check.js";
import setupHandler from "./handlers/setup.js";
import aiAnalysisHandler from "./handlers/ai-analysis.js";
import setupAdminHandler from "./handlers/setup-admin.js";

// Admin handlers
import getAdminUsersHandler from "./handlers/admin/get-users.js";
import togglePauseHandler from "./handlers/admin/toggle-pause.js";
import updateSystemSettingsHandler from "./handlers/admin/update-system-settings.js";
import getSystemSettingsHandler from "./handlers/admin/get-system-settings.js";
import resetPasswordHandler from "./handlers/admin/reset-password.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Iniciando Boot do Servidor Express ---');
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
  console.log(`[API REQUEST] ${req.method} ${req.url}`);
  try {
    if (requiresAuth && !req.user) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    if (req.user) {
      (req as any).auth = req.user;
    }

    // timeout para o handler de 10 segundos para evitar loops infinitos
    const handlerPromise = handler(req, res);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('HANDLER_TIMEOUT')), 10000)
    );

    await Promise.race([handlerPromise, timeoutPromise]);
    
  } catch (error: any) {
    console.error("API ERROR:", error.message);
    
    const isConnError = error.message.toLowerCase().includes('connect') || 
                       error.message.toLowerCase().includes('connection') ||
                       error.message.toLowerCase().includes('pool') ||
                       error.message === 'DATABASE_QUERY_TIMEOUT';
    
    const isTimeout = error.message === 'HANDLER_TIMEOUT' || error.message === 'DATABASE_QUERY_TIMEOUT';
    const status = (isConnError || isTimeout) ? 504 : 500;
    const message = isConnError ? "Erro de Conexão com o Banco" : (isTimeout ? "Tempo esgotado (Servidor Ocupado)" : (error.message || 'Erro interno no servidor'));
    
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

// Production dist
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// Support for local development (Only if not on Vercel)
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
if (!isVercel && (process.env.NODE_ENV !== "production" || process.env.RUN_LOCAL === 'true')) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Development server running on http://0.0.0.0:${PORT}`);
  });
} else {
  // Catch-all para SPA no Vercel (Express 5 compatível)
  app.get("*", (req: any, res: any, next: any) => {
    if (req.url.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, "index.html"), (err: any) => {
        if (err) {
            if (!res.headersSent) res.status(404).send("Not Found");
        }
    });
  });
}

console.log('--- Servidor pronto e rotas mapeadas ---');
export default app;
