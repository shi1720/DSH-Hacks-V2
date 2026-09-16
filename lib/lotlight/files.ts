import { exportCsv, reconcile } from "./engine";
import { activeAction } from "./commands";
import type { Workspace } from "./types";
export function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportAudit(state: Workspace, saved = false) {
  const payload = {
    product: "Lotlight",
    formatVersion: 1,
    storageMode: saved ? "account workspace" : "unsaved in-memory demo",
    exportedAt: new Date().toISOString(),
    scope:
      "Staff-recorded decision-support record. Not independent verification, current recall status, or safety certification.",
    inventoryProvenance: state.inventoryProvenance,
    sourceProvenance: state.notices.some((n) => n.training)
      ? "Contains historical training extracts."
      : "User-supplied sources; not independently verified.",
    workspace: state,
  };
  const text = JSON.stringify(payload);
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  download(
    "lotlight-audit-record.json",
    JSON.stringify(
      {
        payload,
        integrity: {
          algorithm: "SHA-256",
          digest: hash,
          note: "Digest of JSON.stringify(payload). Detects accidental changes; not a digital signature or tamper-proof guarantee.",
        },
      },
      null,
      2,
    ),
    "application/json",
  );
}
export function exportMatches(state: Workspace, saved = false) {
  const rows: unknown[][] = [
    [
      "storage_mode",
      "inventory_provenance",
      "source_provenance",
      "notice_date",
      "exported_at",
      "notice",
      "notice_version",
      "source_url",
      "source_approved_by",
      "inventory_version",
      "product",
      "manufacturer",
      "catalog",
      "lot",
      "quantity",
      "location",
      "match",
      "rationale",
      "evidence",
      "owner",
      "status",
      "handled_quantity",
      "response_evidence",
    ],
  ];
  for (const notice of state.notices)
    for (const match of reconcile(state.inventory, notice)) {
      const a = activeAction(state, notice.id, match.item.id);
      rows.push([
        saved ? "account workspace" : "unsaved in-memory demo",
        state.inventoryProvenance,
        notice.training
          ? "historical training extract"
          : "user-supplied source",
        notice.date,
        new Date().toISOString(),
        notice.title,
        notice.version,
        notice.sourceUrl,
        notice.approvedBy ?? "unreviewed",
        state.inventoryVersion,
        match.item.product,
        match.item.manufacturer,
        match.item.catalog,
        match.item.lot,
        match.item.quantity,
        match.item.location,
        match.kind,
        match.reason,
        match.evidence,
        a?.owner,
        a?.status ?? "open",
        a?.handledQuantity ?? 0,
        a?.evidence,
      ]);
    }
  download(
    "lotlight-inventory-review.csv",
    exportCsv(rows),
    "text/csv;charset=utf-8",
  );
}
export async function readNoticeFile(file: File): Promise<string> {
  if (file.size > 5_000_000) throw new Error("Use a notice smaller than 5 MB.");
  if (file.name.toLowerCase().endsWith(".txt")) return file.text();
  if (!file.name.toLowerCase().endsWith(".pdf"))
    throw new Error("Upload a text-based PDF or a .txt notice.");
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loading = pdfjs.getDocument({
    data: await file.arrayBuffer(),
    isEvalSupported: false,
  });
  const pdf = await loading.promise;
  try {
    if (pdf.numPages > 20)
      throw new Error("Use a notice with 20 pages or fewer.");
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text +=
        content.items
          .map((item) =>
            "str" in item
              ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
              : "",
          )
          .join("") + "\n";
      if (text.length > 50000)
        throw new Error(
          "Extracted text exceeds 50,000 characters. Upload the relevant notice pages.",
        );
    }
    if (text.trim().length < 20)
      throw new Error(
        "This PDF appears to be scanned. OCR is not included; paste a verified transcription instead.",
      );
    return text;
  } finally {
    await pdf.destroy();
  }
}
