import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = 3000;
const url = `http://127.0.0.1:${port}`;
const dataDir = process.env.VALORANT_DATA_DIR || path.join(process.env.LOCALAPPDATA || here, "ValorantStoreTracker");

function reachable() {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(Boolean(response.statusCode && response.statusCode < 500));
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function openBrowser() {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

if (await reachable()) {
  openBrowser();
  console.log("La tienda ya estaba abierta. La dejamos en el navegador.");
  process.exit(0);
}

const child = spawn(path.join(here, "runtime", "node.exe"), ["server.js"], {
  cwd: path.join(here, "app"),
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: String(port),
    VALORANT_DATA_DIR: dataDir,
  },
  stdio: "inherit",
});

let opened = false;
for (let attempt = 0; attempt < 60 && !opened; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  opened = await reachable();
}
if (opened) openBrowser();
else console.log("No pude abrir el navegador. Entrá a mano a " + url);

child.on("exit", (code) => process.exit(code ?? 0));
