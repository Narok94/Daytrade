import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'secret-fallback-for-dev-only';

// Import Vercel handlers
import loginHandler from "./api/login.js";
import registerHandler from "./api/register.js";
import getDataHandler from "./api/get-data.js";
import saveDataHandler from "./api/save-data.js";
import healthCheckHandler from "./api/health-check.js";
import setupHandler from "./api/setup.js";
import aiAnalysisHandler from "./api/ai-analysis.js";
import setupAdminHandler from "./api/setup-admin.js";

// Admin handlers
import getAdminUsersHandler from "./api/admin/get-users.js";
import togglePauseHandler from "./api/admin/toggle-pause.js";
import updateSystemSettingsHandler from "./api/admin/update-system-settings.js";
import getSystemSettingsHandler from "./api/admin/get-system-settings.js";
import resetPasswordHandler from "./api/admin/reset-password.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    try {
      // If auth is required, we expect the middleware to have populated req.user
      if (requiresAuth && !req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      // Inject user into req query/body if it's there, to support the current handler logic
      // but ideally we should update handlers to look at req.user directly.
      // For now, let's inject it into req so handlers can find it easily if they expect it elsewhere.
      if (req.user) {
        // We'll pass it in a custom property that Vercel handlers can access if they are modified
        (req as any).auth = req.user;
      }

      await handler(req, res);
    } catch (error: any) {
      console.error("API Error:", error);
      res.status(500).json({ error: error.message });
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
  
  // Admin routes (should also be protected)
  app.get("/api/admin/get-users", authenticateToken, wrapHandler(getAdminUsersHandler, true));
  app.post("/api/admin/toggle-pause", authenticateToken, wrapHandler(togglePauseHandler, true));
  app.post("/api/admin/update-system-settings", authenticateToken, wrapHandler(updateSystemSettingsHandler, true));
  app.get("/api/admin/get-system-settings", authenticateToken, wrapHandler(getSystemSettingsHandler, true));
  app.post("/api/admin/reset-password", authenticateToken, wrapHandler(resetPasswordHandler, true));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
