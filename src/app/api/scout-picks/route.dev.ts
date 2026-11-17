import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Dev-only: records the picture chooser's picks (frame → chosen candidate) in media/scout/picks.json.
// Nothing is downloaded or approved here; the picks are imported afterwards (scripts/assets/import-picks.mjs).
const FILE = join(process.cwd(), "media", "scout", "picks.json");
const SLOT = /^(wonderverse|thrillverse)\.[a-z0-9.-]+$/;
const ID = /^((pexels|pixabay|coverr)-\d+|link-[a-f0-9]{8})$/;

async function load(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response("Not available", { status: 403 });
  return Response.json(await load());
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not available", { status: 403 });
  const { slot, id } = (await request.json()) as { slot?: string; id?: string | null };
  if (!slot || !SLOT.test(slot) || (id !== null && (!id || !ID.test(id)))) {
    return Response.json({ error: "Send { slot: 'wonderverse.s03.wheel', id: 'pexels-123' | null }" }, { status: 400 });
  }
  const picks = await load();
  if (id) picks[slot] = id;
  else delete picks[slot];
  await writeFile(FILE, JSON.stringify(picks, null, 2));
  return Response.json({ ok: true, picks });
}
