import fs from "fs-extra";

export async function readJsonl(filePath: string) {
  const exists = await fs.pathExists(filePath);
  if (!exists) return [];
  const text = await fs.readFile(filePath, "utf8");
  return text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}
