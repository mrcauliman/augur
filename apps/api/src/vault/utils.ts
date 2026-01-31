import crypto from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function sha1(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

export function jsonlLine(obj: unknown) {
  return JSON.stringify(obj) + "\n";
}
