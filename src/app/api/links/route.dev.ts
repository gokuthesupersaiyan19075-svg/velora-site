import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

// Dev-only: links the site owner pasted into the picture chooser (media/scout/links.json).
// Each link is resolved by scripts/assets/resolve-link.mjs; a usable one becomes an option on its frame
// and is chosen there straight away (media/scout/picks.json). "Apply my choices" puts it on the site.
const run = promisify(execFile);
const ROOT = process.cwd();
const FILE = join(ROOT, "media", "scout", "links.json");
const PICKS = join(ROOT, "media", "scout", "picks.json");
const SLOT = /^(wonderverse|thrillverse)\.[a-z0-9.-]+$/;

export type LinkEntry = {
  key: string;
  url: string;
  slot: string;
  note: string;
  status: "ready" | "pending" | "unsupported";
  message: string;
  option?: Record<string, unknown> & { id: string };
  licenceUnknown?: boolean;
  addedAt: string;
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

const devOnly = () => (process.env.NODE_ENV !== "development" ? new Response("Not available", { status: 403 }) : null);

export async function GET() {
  return devOnly() ?? Response.json(await readJson<LinkEntry[]>(FILE, []));
}

export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { url, slot, note = "" } = (await request.json()) as { url?: string; slot?: string; note?: string };
  if (!url || typeof url !== "string" || url.length > 2000 || !slot || !SLOT.test(slot)) {
    return Response.json({ error: "Paste a link and pick the spot it is for." }, { status: 400 });
  }
  let resolved: Pick<LinkEntry, "status" | "message" | "option" | "licenceUnknown">;
  try {
    const { stdout } = await run(process.execPath, [join(ROOT, "scripts/assets/resolve-link.mjs"), url.trim()], { cwd: ROOT, timeout: 120000 });
    resolved = JSON.parse(stdout);
  } catch {
    resolved = { status: "pending", message: "The link could not be checked automatically. Claude will open it in the browser." };
  }
  const links = await readJson<LinkEntry[]>(FILE, []);
  const entry: LinkEntry = { key: `${Date.now().toString(36)}`, url: url.trim(), slot, note: String(note).slice(0, 300), ...resolved, addedAt: new Date().toISOString() };
  links.unshift(entry);
  await writeFile(FILE, JSON.stringify(links, null, 2));
  // A usable link is chosen on its frame right away.
  const picks = await readJson<Record<string, string>>(PICKS, {});
  if (entry.status === "ready" && entry.option) {
    picks[slot] = entry.option.id;
    await writeFile(PICKS, JSON.stringify(picks, null, 2));
  }
  return Response.json({ entry, links, picks });
}

export async function DELETE(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { key } = (await request.json()) as { key?: string };
  const links = await readJson<LinkEntry[]>(FILE, []);
  const gone = links.find((l) => l.key === key);
  const rest = links.filter((l) => l.key !== key);
  await writeFile(FILE, JSON.stringify(rest, null, 2));
  const picks = await readJson<Record<string, string>>(PICKS, {});
  if (gone?.option && picks[gone.slot] === gone.option.id) {
    delete picks[gone.slot];
    await writeFile(PICKS, JSON.stringify(picks, null, 2));
  }
  return Response.json({ links: rest, picks });
}
