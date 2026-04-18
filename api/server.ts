import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

// Import Handlers with .js extension as requested for ESM
import loginHandler from "../handlers/login.js";
import aiAnalysisHandler from "../handlers/ai-analysis.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Helper to wrap handlers (since they are usually Vercel-style (req, res))
const wrapHandler = (handler: any) => async (req: any, res: any) => {
    try {
        await handler(req, res);
    } catch (error: any) {
        console.error("API ERROR:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Erro interno no servidor' });
        }
    }
};

// --- API ROUTES ---
app.post("/api/login", wrapHandler(loginHandler));
app.post("/api/ai-analysis", wrapHandler(aiAnalysisHandler));

// Mock Data Routes (Para manter o sistema funcionando sem DB)
app.get("/api/get-data", (req, res) => res.json({ brokerages: [], records: [], goals: [] }));
app.post("/api/save-data", (req, res) => res.json({ message: 'Dados salvos (Mock).' }));
app.get("/api/health-check", (req, res) => res.json({ status: 'online', database: 'disconnected' }));

// Admin Mocks
app.get("/api/admin/get-users", (req, res) => {
    res.json([{ id: 'admin-id', username: 'admin', isAdmin: true, isPaused: false, createdAt: new Date() }]);
});
app.get("/api/admin/get-system-settings", (req, res) => res.json({ registrationKeyword: 'ADMIN_BYPASS' }));

// Servindo arquivos estáticos em Produção
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// Fallback para SPA (index.html)
app.get("*", (req: any, res: any, next: any) => {
    if (req.url.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, "index.html"));
});

// Apenas escuta se não estiver na Vercel (ou se for chamado diretamente)
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server (Production Style) running on http://localhost:${PORT}`);
    });
}

export default app;
