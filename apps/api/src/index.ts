import express from "express";
import cors from "cors";
import { CONFIG } from "./config.js";
import { routes } from "./routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

routes(app);

app.listen(CONFIG.port, () => {
  console.log(`[dl] api up on :${CONFIG.port}`);
});
