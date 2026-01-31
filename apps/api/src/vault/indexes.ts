import fs from "fs-extra";
import path from "node:path";
import { pVault, DIRS } from "./paths.js";

export type LastSeen = Record<string, any>;
export type Dedupe = Record<string, boolean>;

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  const exists = await fs.pathExists(filePath);
  if (!exists) return fallback;
  return fs.readJson(filePath);
}

export async function writeJson(filePath: string, data: any) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, data, { spaces: 2 });
}

export async function getLastSeen(vaultPath: string): Promise<LastSeen> {
  return readJson(pVault(vaultPath, ...DIRS.indexes, "last_seen.json"), {});
}

export async function setLastSeen(vaultPath: string, data: LastSeen) {
  return writeJson(pVault(vaultPath, ...DIRS.indexes, "last_seen.json"), data);
}

export async function getDedupe(vaultPath: string): Promise<Dedupe> {
  return readJson(pVault(vaultPath, ...DIRS.indexes, "tx_dedupe.json"), {});
}

export async function setDedupe(vaultPath: string, data: Dedupe) {
  return writeJson(pVault(vaultPath, ...DIRS.indexes, "tx_dedupe.json"), data);
}
