import { readdir } from "node:fs/promises";
import path from "node:path";
import { loadBundle } from "../src/content/load.ts";
import { readBundle } from "./read-bundle.ts";

const prototypes = path.resolve(process.cwd(), "prototypes");
let names: string[] = [];
try {
  names = await readdir(prototypes);
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const dirs: string[] = [];
for (const name of names) {
  const dir = path.join(prototypes, name, "bundle");
  const listed = await readdir(dir).catch(() => []);
  if (listed.includes("bundle.json")) dirs.push(dir);
}

if (dirs.length === 0) {
  console.log("no bundles");
  process.exit(0);
}

for (const dir of dirs) {
  await loadBundle(await readBundle(dir));
  console.log(`${path.relative(process.cwd(), dir)} ok`);
}
