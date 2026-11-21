import { spawn } from "node:child_process";
import path from "node:path";

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev", "-H", "127.0.0.1", "-p", "3000"], {
  stdio: "inherit",
  env: { ...process.env, VALORANT_READER: "fixture" },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
