import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Dev-only helper for asset research: the browser posts candidate lists gathered on stock sites,
// and they are saved to media/intake/<name>.json for the download/curation scripts.
const DIR = join(process.cwd(), "media", "intake");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Private-Network": "true",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET variant for stock sites whose security policy blocks posting to localhost: the research tab
 * navigates here with ?name=<file>&rows=<text>, and the rows (public stock metadata only) are saved
 * as media/intake/<name>.txt.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not available", { status: 403 });
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").replace(/[^a-z0-9-]/gi, "");
  const rows = url.searchParams.get("rows");
  if (!name || !rows) return Response.json({ error: "name and rows required" }, { status: 400 });
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, `${name}.txt`), rows);
  return new Response(`saved ${name}: ${rows.split("\n").length} rows`, { headers: { "content-type": "text/plain" } });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not available", { status: 403, headers: CORS });
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").replace(/[^a-z0-9-]/gi, "");
  if (!name) return Response.json({ error: "name required" }, { status: 400, headers: CORS });
  const body = await request.text();
  JSON.parse(body); // reject anything that is not JSON
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, `${name}.json`), body);
  return Response.json({ ok: true, bytes: body.length }, { headers: CORS });
}
