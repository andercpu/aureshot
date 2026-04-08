import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { transform } from "esbuild";

const projectRoot = process.cwd();
const buildRoot = path.join(projectRoot, "build");

const includedExtensions = new Set([
  ".css",
  ".gif",
  ".html",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".png",
  ".svg",
  ".txt",
  ".webp",
]);

const excludedDirectories = new Set([".git", "build", "node_modules"]);
const excludedFiles = new Set([
  ".gitignore",
  "build.mjs",
  "package-lock.json",
  "package.json",
]);

const minifiableLoaders = new Map([
  [".css", "css"],
  [".js", "js"],
]);

async function main() {
  const manifestPath = path.join(projectRoot, "manifest.json");
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageLockPath = path.join(projectRoot, "package-lock.json");
  const manifest = await readJson("manifest.json");
  const packageJson = await readJson("package.json");
  const packageLock = await readOptionalJson("package-lock.json");
  const nextVersion = incrementVersion(manifest.version);

  manifest.version = nextVersion;
  packageJson.version = nextVersion;

  if (packageLock) {
    packageLock.version = nextVersion;

    if (packageLock.packages && packageLock.packages[""]) {
      packageLock.packages[""].version = nextVersion;
    }
  }

  await writeJson(manifestPath, manifest);
  await writeJson(packageJsonPath, packageJson);

  if (packageLock) {
    await writeJson(packageLockPath, packageLock);
  }

  const localeMessages = await readJson(path.join("_locales", "en", "messages.json"));
  const appName = localeMessages?.appName?.message || path.basename(projectRoot);
  const packageSlug = slugify(appName) || "extension";
  const zipPath = path.join(buildRoot, `${packageSlug}-v${nextVersion}.zip`);
  const files = await collectFiles(projectRoot);

  await fs.rm(buildRoot, { recursive: true, force: true });
  await fs.mkdir(buildRoot, { recursive: true });

  let originalBytes = 0;
  let outputBytes = 0;
  let minifiedCount = 0;
  const zipEntries = [];

  for (const relativePath of files) {
    const sourcePath = path.join(projectRoot, relativePath);
    const sourceBuffer = await fs.readFile(sourcePath);
    const extension = path.extname(relativePath).toLowerCase();

    originalBytes += sourceBuffer.byteLength;

    let outputBuffer = sourceBuffer;

    if (minifiableLoaders.has(extension)) {
      const result = await transform(sourceBuffer.toString("utf8"), {
        loader: minifiableLoaders.get(extension),
        legalComments: "none",
        minify: true,
        target: "chrome120",
      });

      outputBuffer = Buffer.from(result.code);
      minifiedCount += 1;
    }

    outputBytes += outputBuffer.byteLength;
    zipEntries.push({
      contents: outputBuffer,
      name: relativePath.split(path.sep).join("/"),
    });
  }

  await createZipArchive(zipEntries, zipPath);

  const compression = originalBytes
    ? (((originalBytes - outputBytes) / originalBytes) * 100).toFixed(2)
    : "0.00";

  console.log(`Build concluido em: ${buildRoot}`);
  console.log(`Versao atualizada: ${nextVersion}`);
  console.log(`Arquivos processados: ${files.length}`);
  console.log(`JS/CSS minificados: ${minifiedCount}`);
  console.log(`Tamanho antes: ${formatBytes(originalBytes)}`);
  console.log(`Tamanho depois: ${formatBytes(outputBytes)} (${compression}% menor)`);
  console.log(`Zip gerado: ${zipPath}`);
}

async function collectFiles(rootDirectory) {
  const collected = [];

  async function walk(currentDirectory) {
    const entries = await fs.readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);
      const relativePath = path.relative(rootDirectory, absolutePath);

      if (entry.isDirectory()) {
        if (excludedDirectories.has(entry.name)) {
          continue;
        }

        await walk(absolutePath);
        continue;
      }

      if (!shouldIncludeFile(relativePath)) {
        continue;
      }

      collected.push(relativePath);
    }
  }

  await walk(rootDirectory);
  collected.sort((left, right) => left.localeCompare(right));
  return collected;
}

function shouldIncludeFile(relativePath) {
  const fileName = path.basename(relativePath);

  if (excludedFiles.has(fileName)) {
    return false;
  }

  const extension = path.extname(relativePath).toLowerCase();
  return includedExtensions.has(extension);
}

async function readJson(relativePath) {
  const contents = await fs.readFile(path.join(projectRoot, relativePath), "utf8");
  return JSON.parse(contents);
}

async function readOptionalJson(relativePath) {
  try {
    return await readJson(relativePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJson(absolutePath, value) {
  await fs.writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function createZipArchive(entries, destinationPath) {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });

  await new Promise((resolve, reject) => {
    const output = createWriteStream(destinationPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.on("warning", (error) => {
      if (error.code === "ENOENT") {
        console.warn(error.message);
        return;
      }

      reject(error);
    });

    archive.pipe(output);

    for (const entry of entries) {
      archive.append(entry.contents, {
        name: entry.name,
      });
    }

    archive.finalize();
  });
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-")
    .toLowerCase();
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;
  return `${size.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

function incrementVersion(version) {
  const parts = String(version || "")
    .split(".")
    .map((part) => Number.parseInt(part, 10));

  if (!parts.length || parts.length > 4 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Versao invalida para incremento automatico: ${version}`);
  }

  parts[parts.length - 1] += 1;
  return parts.join(".");
}

main().catch((error) => {
  console.error("Falha no build.");
  console.error(error);
  process.exitCode = 1;
});
