import path from "node:path";

export function pVault(vaultPath: string, ...parts: string[]) {
  return path.join(vaultPath, ...parts);
}

export const DIRS = {
  config: ["config"],
  data: ["data"],
  accounts: ["data", "accounts"],
  assets: ["data", "assets"],
  snapshots: ["data", "snapshots"],
  events: ["data", "events"],
  indexes: ["data", "indexes"],
  reportsMonthly: ["reports", "monthly"],
  exportsJson: ["exports", "json"],
  exportsCsv: ["exports", "csv"],
  logsRuns: ["logs", "runs"],
  logsErrors: ["logs", "errors"],
  tmp: ["tmp"]
} as const;
