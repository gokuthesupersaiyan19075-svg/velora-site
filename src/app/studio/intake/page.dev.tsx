"use client";

import { useEffect, useState } from "react";

/**
 * Dev-only relay for asset research. A stock-site tab navigates here with
 * #name=<file>&rows=<text> (public stock metadata only); the rows are saved through /api/intake
 * and the long address is replaced with a short one.
 */
export default function IntakeRelay() {
  const [msg, setMsg] = useState("Waiting for data…");
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1));
    const name = p.get("name");
    const rows = p.get("rows");
    window.history.replaceState(null, "", `/studio/intake${name ? `?saved=${name}` : ""}`);
    if (!name || !rows) return;
    fetch(`/api/intake?name=${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify({ rows }) })
      .then((r) => r.json())
      .then((j) => setMsg(j.ok ? `saved ${name}: ${rows.split("\n").length} rows` : "failed"))
      .catch(() => setMsg("failed"));
  }, []);
  return <p style={{ padding: 24, fontFamily: "system-ui" }}>{msg}</p>;
}
