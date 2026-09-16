import type { InventoryItem, Match, Notice, Scope } from "./types";
/** Conservative normalization preserves separators and leading zeroes. */
export const identifier = (value: string) =>
  value.normalize("NFKC").trim().toUpperCase();
export const company = (value: string) =>
  value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export function matchItem(
  item: InventoryItem,
  notice: Notice,
  similarity?: number,
): Match {
  const manufacturerMatches =
    company(item.manufacturer) === company(notice.manufacturer);
  const productScope = notice.scope.filter(
    (s) => identifier(s.catalog) === identifier(item.catalog),
  );
  const semanticallyRelated = similarity !== undefined && similarity >= 0.3;
  const words = notice.title
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const nameRelated = words.some((w) => item.product.toLowerCase().includes(w));
  const base = { item, similarity };
  if (item.manufacturer && !manufacturerMatches && productScope.length)
    return {
      ...base,
      kind: "missing",
      reason:
        "Catalog agrees, but manufacturer identity differs. Verify whether this is an alias or a different maker.",
      evidence: `Inventory: ${item.manufacturer}. Source: ${notice.manufacturer}. Catalog ${item.catalog}.`,
    };
  if (item.manufacturer && !manufacturerMatches)
    return {
      ...base,
      kind: "unlisted",
      reason:
        "Manufacturer differs. No listed match in this notice; this is not a safety clearance.",
      evidence: `Inventory manufacturer: ${item.manufacturer}. Notice manufacturer: ${notice.manufacturer}.`,
    };
  if (!item.catalog) {
    if (manufacturerMatches || semanticallyRelated || nameRelated)
      return {
        ...base,
        kind: semanticallyRelated ? "possible" : "missing",
        reason: semanticallyRelated
          ? "AI found a similar description, but catalog and lot evidence must be checked."
          : "Catalog number is missing. Check the physical label before deciding.",
        evidence:
          "No catalog identifier available. Product-name similarity cannot prove recall scope.",
      };
    return {
      ...base,
      kind: "missing",
      reason:
        "Product identity is incomplete. Obtain manufacturer and catalog information.",
      evidence: "Missing catalog and unverified manufacturer.",
    };
  }
  if (!productScope.length)
    return {
      ...base,
      kind: "unlisted",
      reason:
        "Catalog is not listed in this reviewed scope. This does not establish safety or cover other notices.",
      evidence: `Inventory catalog ${item.catalog}; listed: ${notice.scope.map((s) => s.catalog).join(", ")}.`,
    };
  if (!item.manufacturer)
    return {
      ...base,
      kind: "missing",
      reason:
        "Catalog matches but manufacturer is missing. Verify the physical label.",
      evidence: productScope[0].evidence,
    };
  if (!item.lot && !productScope.some((s) => s.allLots))
    return {
      ...base,
      kind: "missing",
      reason:
        "Catalog matches, but the lot is missing. The item cannot be cleared.",
      evidence: productScope.map((s) => s.evidence).join("\n"),
    };
  const scope = productScope.find(
    (s) =>
      s.allLots || s.lots.some((l) => identifier(l) === identifier(item.lot)),
  );
  if (scope)
    return {
      ...base,
      kind: "exact",
      reason:
        "Manufacturer, catalog, and listed lot scope agree. Verify the physical label and current notice before acting.",
      evidence: scope.evidence,
    };
  return {
    ...base,
    kind: "unlisted",
    reason:
      "Catalog matches, but this lot is not listed in the reviewed scope. No safety clearance is implied.",
    evidence: productScope.map((s) => s.evidence).join("\n"),
  };
}
export function reconcile(
  inventory: InventoryItem[],
  notice: Notice,
  scores: Record<string, number> = {},
) {
  const order = { exact: 0, missing: 1, possible: 2, unlisted: 3 };
  return inventory
    .map((item) => matchItem(item, notice, scores[item.id]))
    .sort(
      (a, b) =>
        order[a.kind] - order[b.kind] ||
        (b.similarity ?? 0) - (a.similarity ?? 0),
    );
}
/** Extract only explicitly paired labeled lines. Never cross-join catalogs and lots. */
export function extractScope(text: string): Scope[] {
  const result: Scope[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(
      /^\s*(?:Catalog|REF|Model)\s*:\s*([A-Za-z0-9._/-]+)\s*;\s*Lots?\s*:\s*(.+?)\s*$/i,
    );
    if (!m) continue;
    const raw = m[2].trim();
    if (
      /(?:\bto\b|\bthrough\b|\bexcept\b|\bexcluding\b|\bbetween\b|\bonly if\b|\*|\.\.)/i.test(
        raw,
      )
    )
      continue;
    const allLots = /^all lots$/i.test(raw);
    const lots = allLots
      ? []
      : raw
          .split(/[,;]/)
          .map((l) => l.trim())
          .filter(Boolean);
    if (!allLots && lots.some((l) => !/^[A-Za-z0-9._/-]+$/.test(l))) continue;
    result.push({ catalog: m[1], lots, allLots, evidence: line.trim() });
  }
  return result;
}
export function validateScope(
  notice: Pick<Notice, "text" | "scope" | "manufacturer">,
): string | null {
  if (!notice.scope.length)
    return "Add at least one explicit catalog and lot pair. Ranges, exclusions, and serial-number scope need specialist review.";
  if (!notice.text.toLowerCase().includes(notice.manufacturer.toLowerCase()))
    return "Manufacturer must appear in the source text.";
  for (const s of notice.scope) {
    if (!s.evidence.trim() || !notice.text.includes(s.evidence))
      return "Every scope row needs a verbatim supporting excerpt from the source text.";
    const lines = s.evidence.split(/\r?\n/).filter((l) => l.trim());
    const parsed = extractScope(s.evidence);
    if (lines.length !== 1 || parsed.length !== 1)
      return "Use one unambiguous labeled source line per scope row: Catalog: ABC; Lots: 123, 456. For tables, append a staff-checked labeled transcription to the preserved source first.";
    const pair = parsed[0];
    if (
      identifier(pair.catalog) !== identifier(s.catalog) ||
      pair.allLots !== s.allLots
    )
      return "Declared scope must exactly match its single labeled source pair.";
    const expected = pair.lots.map(identifier).sort();
    const actual = s.lots.map(identifier).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual))
      return "Declared lots must match the complete lot list in the supporting source pair exactly.";
  }
  return null;
}
export function parseCsv(text: string): InventoryItem[] {
  if (text.length > 500_000) throw new Error("CSV exceeds the 500 KB limit.");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || field.length === 0) quoted = !quoted;
      else throw new Error("Invalid quote in CSV.");
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2)
    throw new Error("CSV needs a header and at least one inventory line.");
  if (rows.length > 501)
    throw new Error("Import up to 500 inventory lines per workspace.");
  const headers = rows.shift()!.map((h) => h.trim().toLowerCase());
  const required = [
    "product",
    "manufacturer",
    "catalog",
    "lot",
    "quantity",
    "location",
  ];
  if (new Set(headers).size !== headers.length)
    throw new Error("CSV contains duplicate column names.");
  for (const name of required)
    if (!headers.includes(name))
      throw new Error(
        `Missing column: ${name}. Use the downloadable template.`,
      );
  const seen = new Set<string>();
  return rows.map((values, i) => {
    if (values.length !== headers.length)
      throw new Error(`Row ${i + 2}: column count does not match the header.`);
    const get = (key: string) => (values[headers.indexOf(key)] ?? "").trim();
    const quantity = Number(get("quantity"));
    if (
      !get("quantity") ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1_000_000
    )
      throw new Error(
        `Row ${i + 2}: quantity must be a whole number from 1 to 1,000,000.`,
      );
    if (!get("product") || !get("location"))
      throw new Error(`Row ${i + 2}: product and location are required.`);
    if (values.some((v) => v.length > 500))
      throw new Error(`Row ${i + 2}: a field exceeds 500 characters.`);
    const key = [
      get("product"),
      get("manufacturer"),
      get("catalog"),
      get("lot"),
      get("location"),
    ]
      .map(identifier)
      .join("|");
    if (seen.has(key))
      throw new Error(
        `Row ${i + 2}: duplicate inventory line. Combine quantities before importing.`,
      );
    seen.add(key);
    return {
      id: crypto.randomUUID(),
      product: get("product"),
      manufacturer: get("manufacturer"),
      catalog: get("catalog"),
      lot: get("lot"),
      quantity,
      location: get("location"),
    };
  });
}
export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export function exportCsv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
