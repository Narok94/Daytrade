import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

// Import Vercel handlers
import loginHandler from "./api/login";
import registerHandler from "./api/register";
import getDataHandler from "./api/get-data";
import saveDataHandler from "./api/save-data";
import healthCheckHandler from "./api/health-check";
import setupHandler from "./api/setup";
import getUsersHandler from "./api/admin/get-users";
import togglePauseHandler from "./api/admin/toggle-pause";
import resetPasswordHandler from "./api/admin/reset-password";
import getSystemSettingsHandler from "./api/admin/get-system-settings";
import updateSystemSettingsHandler from "./api/admin/update-system-settings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vite dev server compatibility
    crossOriginEmbedderPolicy: false
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: "Muitas requisições deste IP, por favor tente novamente mais tarde." }
  });
  app.use("/api/", limiter);

  app.use(express.json());

  // JWT Verification Middleware
  const verifyToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Acesso negado. Token não fornecido." });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-dev-only');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: "Token inválido ou expirado." });
    }
  };

  const verifyAdmin = (req: any, res: any, next: any) => {
    verifyToken(req, res, () => {
      if (req.user && req.user.isAdmin) {
        next();
      } else {
        res.status(403).json({ error: "Acesso negado. Requer privilégios de administrador." });
      }
    });
  };

  // Helper to wrap Vercel handlers for Express
  const wrapHandler = (handler: any) => async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error("API Error:", error);
      res.status(500).json({ error: error.message });
    }
  };

  // API routes
  app.post("/api/login", wrapHandler(loginHandler));
  app.post("/api/register", wrapHandler(registerHandler));
  app.get("/api/get-data", verifyToken, wrapHandler(getDataHandler));
  app.post("/api/save-data", verifyToken, wrapHandler(saveDataHandler));
  app.get("/api/health-check", wrapHandler(healthCheckHandler));
  app.get("/api/setup", wrapHandler(setupHandler));

  // Admin routes
  app.get("/api/admin/get-users", verifyAdmin, wrapHandler(getUsersHandler));
  app.post("/api/admin/toggle-pause", verifyAdmin, wrapHandler(togglePauseHandler));
  app.post("/api/admin/reset-password", verifyAdmin, wrapHandler(resetPasswordHandler));
  app.get("/api/admin/get-system-settings", verifyAdmin, wrapHandler(getSystemSettingsHandler));
  app.post("/api/admin/update-system-settings", verifyAdmin, wrapHandler(updateSystemSettingsHandler));

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
