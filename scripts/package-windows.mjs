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
  fs.cpSync(from, to, { recursive: true });
}

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Falta .next/standalone. Corré npm run build antes de empaquetar.");
}

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
copyDir(standalone, path.join(staging, "app"));
fs.rmSync(path.join(staging, "app", "data"), { recursive: true, force: true });
copyDir(path.join(root, ".next", "static"), path.join(staging, "app", ".next", "static"));
if (fs.existsSync(path.join(root, "public"))) copyDir(path.join(root, "public"), path.join(staging, "app", "public"));

const wasmFrom = path.join(root, "node_modules", "sql.js", "dist");
const wasmTo = path.join(staging, "app", "node_modules", "sql.js", "dist");
fs.mkdirSync(wasmTo, { recursive: true });
for (const file of fs.readdirSync(wasmFrom)) {
  fs.copyFileSync(path.join(wasmFrom, file), path.join(wasmTo, file));
}

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
console.log(`Listo: ${zipPath} (${Math.round(zip.size / 1_048_576)} MB)`);
