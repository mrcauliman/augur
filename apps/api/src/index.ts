import express from "express";
import cors from "cors";
import { CONFIG } from "./config.js";
import { routes } from "./routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "augur-api" }));
routes(app);

app.listen(CONFIG.port, () => {
  console.log(`[augur] api up on :${CONFIG.port}`);
});
