import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Import Vercel handlers
import loginHandler from "./api/login";
import registerHandler from "./api/register";
import getDataHandler from "./api/get-data";
import saveDataHandler from "./api/save-data";
import healthCheckHandler from "./api/health-check";
import setupHandler from "./api/setup";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
  app.get("/api/get-data", wrapHandler(getDataHandler));
  app.post("/api/save-data", wrapHandler(saveDataHandler));
  app.get("/api/health-check", wrapHandler(healthCheckHandler));
  app.get("/api/setup", wrapHandler(setupHandler));

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
