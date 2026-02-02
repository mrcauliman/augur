import express from "express";
import cors from "cors";

import { CONFIG } from "./config";
import { registerExtras } from "./routes_extras";

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "augur-api" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "augur-api" });
});

registerExtras(app);

app.listen(CONFIG.port, () => {
  console.log(`[augur] api up on :${CONFIG.port}`);
});
