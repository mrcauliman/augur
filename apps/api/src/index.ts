// /var/www/augur/apps/api/src/index.ts
import express from "express";
import cors from "cors";

import { registerRoutesExtras } from "./routes_extras";

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "augur-api" });
});

// API routes
registerRoutesExtras(app);

// Port + bind
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`[augur] api up on ${HOST}:${PORT}`);
});
