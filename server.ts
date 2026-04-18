import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { createServer as createViteServer } from "vite";

// Import Handlers with .js extension 
import loginHandler from "./handlers/login.js";
import aiAnalysisHandler from "./handlers/ai-analysis.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('--- Iniciando Servidor MOCK (Sem Banco de Dados) ---');
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static('public')); // Serve public folder explicitly

  // Support req.user for backward compatibility if needed, but set it as admin by default or remove
  app.use((req: any, res, next) => {
    req.user = { id: 'admin-id', username: 'admin', is_admin: true };
    next();
  });

  // Helper to wrap Vercel handlers for Express
  const wrapHandler = (handler: any) => async (req: any, res: any) => {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error("API ERROR:", error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Erro interno no servidor' });
      }
    }
  };

  // Log all requests for diagnosis
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    next();
  });

  // Fallback for logo if it's not being served from public yet
  app.get("/logo-odin.png", (req, res) => {
    console.log("[SERVER] Serving logo fallback redirect");
    res.redirect("https://picsum.photos/seed/odin-logo/400/400");
  });

  // --- MOCK API ROUTES ---

  // Login Mock
  app.post("/api/login", wrapHandler(loginHandler));

  // Register Mock
  app.post("/api/register", (req, res) => {
      res.status(400).json({ error: 'O registro está desativado temporariamente. Use o login admin/admin.' });
  });

  // Get Data Mock (Returns empty or handled by frontend localStorage)
  app.get("/api/get-data", (req, res) => {
      res.json({ brokerages: [], records: [], goals: [] });
  });

  // Save Data Mock (Success only)
  app.post("/api/save-data", (req, res) => {
      res.json({ message: 'Dados salvos localmente (Mock).' });
  });

  // Health Check Mock
  app.get("/api/health-check", (req, res) => {
      res.json({ status: 'online', database: 'disconnected (mock mode)' });
  });

  // AI Analysis (Keep real functionality)
  app.post("/api/ai-analysis", wrapHandler(aiAnalysisHandler));

  // Admin Mocks
  app.get("/api/admin/get-users", (req: any, res) => {
      res.json([{ id: 'admin-id', username: 'admin', isAdmin: true, isPaused: false, createdAt: new Date(), lastLoginAt: new Date() }]);
  });

  app.post("/api/admin/toggle-pause", (req: any, res) => {
      res.json({ message: 'Status alterado (Mock).' });
  });

  app.post("/api/admin/update-system-settings", (req: any, res) => {
      res.json({ message: 'Configurações atualizadas (Mock).' });
  });

  app.get("/api/admin/get-system-settings", (req: any, res) => {
      res.json({ registrationKeyword: 'ADMIN_BYPASS' });
  });

  app.post("/api/admin/reset-password", (req: any, res) => {
      res.json({ message: 'Senha resetada (Mock).' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any, next: any) => {
      if (req.url.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mock server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
