import fs from "node:fs";
import path from "node:path";
import { dataDirectory } from "@/lib/data-dir";

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(file) || file.includes("..")) return new Response("No encontrado", { status: 400 });
  const full = path.join(/*turbopackIgnore: true*/ dataDirectory(), "images", file);
  if (!fs.existsSync(full)) return new Response("No encontrado", { status: 404 });
  const data = fs.readFileSync(full);
  const type = contentType(file);
  return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400" } });
}

function contentType(file: string): string {
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".webp")) return "image/webp";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".gif")) return "image/gif";
  return "image/png";
}
