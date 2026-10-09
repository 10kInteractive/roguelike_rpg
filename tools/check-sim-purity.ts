import { type Dirent, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const simRoot = path.resolve(process.cwd(), "src/sim");
const randomCall = /Math\s*\.\s*random\b/;

async function typescriptFiles(dir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await typescriptFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const violations: string[] = [];
for (const file of await typescriptFiles(simRoot)) {
  const lines = (await readFile(file, "utf8")).split("\n");
  for (const [index, line] of lines.entries()) {
    if (randomCall.test(line)) {
      const relative = path.relative(process.cwd(), file);
      violations.push(`${relative}:${index + 1} uses Math.random`);
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(violation);
  }
  process.exit(1);
}

console.log("sim purity ok");
