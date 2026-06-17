import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const bumpType = process.argv[2] || "patch";
const allowedTypes = new Set(["patch", "minor", "major"]);

if (!allowedTypes.has(bumpType)) {
  console.error("Use: npm run version:bump -- patch|minor|major");
  process.exit(1);
}

function bumpVersion(version, type) {
  const [major = 0, minor = 0, patch = 0] = String(version)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);

  if (type === "major") {
    return `${major + 1}.0.0`;
  }

  if (type === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

const packagePath = path.join(rootDir, "package.json");
const lockPath = path.join(rootDir, "package-lock.json");
const versionPath = path.join(rootDir, "src", "lib", "version.ts");

const pkg = await readJson(packagePath);
const nextVersion = bumpVersion(pkg.version, bumpType);
const today = new Date().toISOString().slice(0, 10);

pkg.version = nextVersion;
await writeJson(packagePath, pkg);

if (existsSync(lockPath)) {
  const lock = await readJson(lockPath);
  lock.version = nextVersion;

  if (lock.packages?.[""]) {
    lock.packages[""].version = nextVersion;
  }

  await writeJson(lockPath, lock);
}

await writeFile(
  versionPath,
  [
    `export const systemVersion = "${nextVersion}";`,
    `export const systemVersionUpdatedAt = "${today}";`,
    "",
  ].join("\n")
);

console.log(`Versao atualizada para v${nextVersion}`);
