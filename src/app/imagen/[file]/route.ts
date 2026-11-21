import fs from "node:fs";
import path from "node:path";

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(file) || file.includes("..")) return new Response("No encontrado", { status: 400 });
  const full = path.join(process.cwd(), "data", "images", file);
  if (!fs.existsSync(full)) return new Response("No encontrado", { status: 404 });
  const data = fs.readFileSync(full);
  const type = file.endsWith(".svg") ? "image/svg+xml" : file.endsWith(".webp") ? "image/webp" : "image/png";
  return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400" } });
}
