import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const configPath = fileURLToPath(new URL("../challenges.json", import.meta.url));

export async function loadChallenges() {
  const content = await readFile(configPath, "utf8");
  const config = JSON.parse(content);
  return Array.isArray(config.challenges) ? config.challenges : [];
}

export function challengeSummary(challenges) {
  return challenges.map(({ id, name, description, enabled = true, criteria = {} }) => ({
    id,
    name,
    description,
    enabled,
    criteria
  }));
}
