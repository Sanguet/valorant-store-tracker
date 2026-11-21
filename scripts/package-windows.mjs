import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nodeVersion = "20.18.1";
const folderName = "Valorant Tienda";
const staging = path.join(root, "dist", folderName);
const zipPath = path.join(root, "dist", "valorant-tienda-windows.zip");
const cache = path.join(root, "dist", "cache");
const standalone = path.join(root, ".next", "standalone");

function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true, dereference: true });
}

function isJunction(full, stat) {
  if (!stat.isDirectory()) return false;
  try {
    return Boolean(fs.readlinkSync(full));
  } catch {
    return false;
  }
}

function materializeLinks(directory) {
  for (const name of fs.readdirSync(directory)) {
    const full = path.join(directory, name);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink() || isJunction(full, stat)) {
      const target = fs.realpathSync(full);
      fs.rmSync(full, { recursive: true, force: true });
      fs.cpSync(target, full, { recursive: true, dereference: true });
      continue;
    }
    if (stat.isDirectory()) materializeLinks(full);
  }
}

function pruneSqlPackage(directory) {
  const dist = path.join(directory, "dist");
  if (!fs.existsSync(dist)) return;
  for (const file of fs.readdirSync(dist)) {
    if (file === "sql-wasm.js" || file === "sql-wasm.wasm") continue;
    fs.rmSync(path.join(dist, file), { recursive: true, force: true });
  }
}

function pruneSqlDir(directory) {
  if (!fs.existsSync(directory)) return;
  for (const name of fs.readdirSync(directory)) {
    if (name === "sql.js" || name.startsWith("sql.js-")) pruneSqlPackage(path.join(directory, name));
  }
}

function collectRequiredModules(directory, ids) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectRequiredModules(full, ids);
      continue;
    }
    if (!entry.name.endsWith(".js")) continue;
    const source = fs.readFileSync(full, "utf8");
    for (const match of source.matchAll(/require\("([^"]+)"\)/g)) {
      if (match[1].startsWith("next/")) ids.add(match[1]);
    }
  }
}

function copyRequiredNextFiles(appDir) {
  const ids = new Set();
  collectRequiredModules(path.join(appDir, ".next", "server"), ids);
  for (const id of ids) {
    const destination = path.join(appDir, "node_modules", ...id.split("/"));
    if (fs.existsSync(destination)) continue;
    const source = path.join(root, "node_modules", ...id.split("/"));
    if (!fs.existsSync(source) || fs.lstatSync(source).isSymbolicLink()) {
      throw new Error(`El paquete necesita ${id} como archivo real.`);
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Falta .next/standalone. Corré npm run build antes de empaquetar.");
}

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
copyDir(standalone, path.join(staging, "app"));
materializeLinks(path.join(staging, "app"));
fs.rmSync(path.join(staging, "app", "data"), { recursive: true, force: true });
fs.rmSync(path.join(staging, "app", "dist"), { recursive: true, force: true });
copyDir(path.join(root, ".next", "static"), path.join(staging, "app", ".next", "static"));
if (fs.existsSync(path.join(root, "public"))) copyDir(path.join(root, "public"), path.join(staging, "app", "public"));

const sqlPackage = path.join(root, "node_modules", "sql.js");
const sqlTo = path.join(staging, "app", "node_modules", "sql.js");
fs.mkdirSync(path.join(sqlTo, "dist"), { recursive: true });
fs.copyFileSync(path.join(sqlPackage, "package.json"), path.join(sqlTo, "package.json"));
for (const file of ["sql-wasm.js", "sql-wasm.wasm"]) {
  fs.copyFileSync(path.join(sqlPackage, "dist", file), path.join(sqlTo, "dist", file));
}
pruneSqlDir(path.join(staging, "app", "node_modules"));
pruneSqlDir(path.join(staging, "app", ".next", "node_modules"));
copyRequiredNextFiles(path.join(staging, "app"));

fs.mkdirSync(cache, { recursive: true });
const nodeZip = path.join(cache, `node-v${nodeVersion}-win-x64.zip`);
if (!fs.existsSync(nodeZip)) {
  const response = await fetch(`https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-win-x64.zip`);
  if (!response.ok) throw new Error(`No pude bajar Node ${nodeVersion}: ${response.status}`);
  fs.writeFileSync(nodeZip, Buffer.from(await response.arrayBuffer()));
}
const nodeExtract = path.join(cache, `node-v${nodeVersion}-win-x64`);
fs.rmSync(nodeExtract, { recursive: true, force: true });
fs.mkdirSync(nodeExtract, { recursive: true });
execFileSync("tar", ["-xf", nodeZip, "-C", cache], { stdio: "inherit" });
const runtime = path.join(staging, "runtime");
fs.mkdirSync(runtime, { recursive: true });
fs.copyFileSync(path.join(nodeExtract, "node.exe"), path.join(runtime, "node.exe"));

fs.copyFileSync(path.join(root, "scripts", "windows-launcher.mjs"), path.join(staging, "launcher.mjs"));
fs.writeFileSync(
  path.join(staging, "Abrir la tienda.bat"),
  ["@echo off", "cd /d \"%~dp0\"", "echo.", "echo La tienda se abre en el navegador.", "echo No cierres esta ventana mientras la uses.", "echo Para salir, cerra esta ventana.", "echo.", "runtime\\node.exe launcher.mjs", "if errorlevel 1 pause", ""].join("\r\n"),
  "utf8",
);
fs.writeFileSync(
  path.join(staging, "LEEME.txt"),
  [
    "Tienda de Valorant",
    "",
    "1. Descomprimí este zip.",
    "2. Abrí el Riot Client e iniciá sesión ahí.",
    "3. Hacé doble clic en \"Abrir la tienda.bat\".",
    "4. Se abre el navegador en esta computadora. No hace falta instalar Node ni git.",
    "",
    "No cierres la ventana negra mientras mirás la tienda. Si la cerrás, la tienda se apaga.",
    "La próxima vez, volvé a hacer doble clic en el mismo archivo.",
    "",
    "El historial queda en %LOCALAPPDATA%\\ValorantStoreTracker.",
    "Si bajás una versión nueva, descomprimila en otra carpeta: ese historial se conserva.",
    "",
  ].join("\r\n"),
  "utf8",
);

fs.rmSync(zipPath, { force: true });
execFileSync("tar", ["-a", "-c", "-f", zipPath, "-C", path.join(root, "dist"), folderName], { stdio: "inherit" });
const zip = fs.statSync(zipPath);
if (zip.size < 1_000_000) throw new Error("El zip quedó demasiado chico.");
const listing = execFileSync("tar", ["-tvf", zipPath], { encoding: "utf8" });
const links = listing.split(/\r?\n/).filter((line) => line.startsWith("l"));
if (links.length) {
  throw new Error(`El zip contiene enlaces que no funcionan en otra PC:\n${links.join("\n")}`);
}
if (!listing.includes("node_modules/sql.js/dist/sql-wasm.wasm")) {
  throw new Error("El zip no incluye sql-wasm.wasm");
}
if (!/sql\.js-[^/\s]+\/dist\/sql-wasm\.js/.test(listing)) {
  throw new Error("El zip no incluye el sql.js que carga el servidor.");
}
if (!listing.includes("next/dist/compiled/next-server/app-route-turbo.runtime.prod.js")) {
  throw new Error("El zip no incluye el runtime que sirve las imágenes.");
}
console.log(`Listo: ${zipPath} (${Math.round(zip.size / 1_048_576)} MB)`);
