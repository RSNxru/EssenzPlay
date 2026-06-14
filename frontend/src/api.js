// Cliente API minimalista. En dev usa el proxy de Vite (/api -> backend).
const BASE = import.meta.env.VITE_API_URL || "";

export async function extract(query) {
  const res = await fetch(`${BASE}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    // El backend devuelve {detail: {code, message, detail}} en errores de dominio
    const body = await res.json().catch(() => ({}));
    const d = body.detail || {};
    throw {
      code: d.code || "GENERIC",
      message: d.message || "Ocurrió un error inesperado.",
      detail: d.detail,
    };
  }
  return res.json();
}

export async function getSponsorSegments(videoId) {
  const res = await fetch(`${BASE}/api/sponsorblock/${videoId}`);
  return res.ok ? res.json() : [];
}

export async function startDownload(url, format, title) {
  const res = await fetch(`${BASE}/api/downloads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, format, title }),
  });
  return res.json();
}

export function streamDownload(jobId, onUpdate) {
  const es = new EventSource(`${BASE}/api/downloads/${jobId}/events`);
  es.addEventListener("progress", (e) => onUpdate(JSON.parse(e.data)));
  es.addEventListener("end", (e) => {
    onUpdate(JSON.parse(e.data));
    es.close();
  });
  es.addEventListener("error", () => es.close());
  return () => es.close();
}

export async function getHistory() {
  const res = await fetch(`${BASE}/api/history`);
  return res.ok ? res.json() : [];
}
