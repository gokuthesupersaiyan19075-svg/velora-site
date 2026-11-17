import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Dev-only: the asset board writes decisions here.
//   { id, status }            approve / reject / reset one file           → media/approvals.json
//   { slot, asset }           "Use this here": pick a file for one frame   → media/slot-choices.json (+ approves the file)
//   { slot, asset: null }     clear that frame's pick (back to preference order)
const APPROVALS = join(process.cwd(), "media", "approvals.json");
const CHOICES = join(process.cwd(), "media", "slot-choices.json");
const STATUSES = new Set(["approved", "candidate", "rejected"]);
const ASSET_ID = /^(pexels|pixabay|coverr)-\d+$/;
const SLOT_ID = /^(wonderverse|thrillverse)\.[a-z0-9.-]+$/;

async function readJson(file: string): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return {};
  }
}

async function writeJson(file: string, data: Record<string, string>) {
  await writeFile(file, JSON.stringify(data, null, 2) + "\n");
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Choices can only be changed in the local review build." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { id?: string; status?: string; slot?: string; asset?: string | null } | null;

  if (body?.slot !== undefined) {
    if (!SLOT_ID.test(body.slot) || (body.asset !== null && !ASSET_ID.test(body.asset ?? ""))) {
      return Response.json({ error: "Send { slot: 'wonderverse.s03.coaster', asset: 'pexels-123' | null }." }, { status: 400 });
    }
    const choices = await readJson(CHOICES);
    if (body.asset === null) {
      delete choices[body.slot];
    } else {
      choices[body.slot] = body.asset!;
      const approvals = await readJson(APPROVALS);
      approvals[body.asset!] = "approved";
      await writeJson(APPROVALS, approvals);
    }
    await writeJson(CHOICES, choices);
    return Response.json({ ok: true, slot: body.slot, asset: body.asset });
  }

  if (!body?.id || !body.status || !STATUSES.has(body.status) || !ASSET_ID.test(body.id)) {
    return Response.json({ error: "Send { id: 'pexels-123', status: 'approved' | 'candidate' | 'rejected' }." }, { status: 400 });
  }
  const approvals = await readJson(APPROVALS);
  if (body.status === "candidate") delete approvals[body.id];
  else approvals[body.id] = body.status;
  await writeJson(APPROVALS, approvals);
  return Response.json({ ok: true, id: body.id, status: body.status });
}
