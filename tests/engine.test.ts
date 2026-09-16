import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchItem,
  identifier,
  extractScope,
  validateScope,
  parseCsv,
  exportCsv,
} from "../lib/lotlight/engine";
import {
  initialWorkspace,
  SAMPLE_CSV,
  sampleNotice,
} from "../lib/lotlight/sample";
import { reduceWorkspace, activeAction } from "../lib/lotlight/commands";
import type { InventoryItem, Notice } from "../lib/lotlight/types";
const fixture = () => initialWorkspace();
const item = (patch: Partial<InventoryItem> = {}) => ({
  ...fixture().inventory[0],
  ...patch,
});
const approve = () =>
  reduceWorkspace(
    fixture(),
    { type: "approve_notice", noticeId: "baxter-demo", sourceConfirmed: true },
    "Test reviewer",
  );
const action = (patch: Record<string, unknown> = {}) => ({
  type: "save_action",
  noticeId: "baxter-demo",
  itemId: "sample-1",
  owner: "Maya Rao",
  dueDate: "2026-10-01",
  status: "assigned",
  verification: "",
  evidence: "",
  handledQuantity: 0,
  ...patch,
});
test("exact match requires manufacturer, paired catalog and lot", () =>
  assert.equal(matchItem(item(), sampleNotice).kind, "exact"));
test("cross-product lot must not match", () =>
  assert.equal(
    matchItem(item({ lot: "R25A13024" }), sampleNotice).kind,
    "unlisted",
  ));
test("missing lot never becomes exact at maximum semantic similarity", () =>
  assert.equal(matchItem(item({ lot: "" }), sampleNotice, 1).kind, "missing"));
test("semantic candidate cannot override explicit catalog mismatch", () =>
  assert.equal(
    matchItem(item({ catalog: "WRONG" }), sampleNotice, 1).kind,
    "unlisted",
  ));
test("missing catalog can only be an AI candidate", () =>
  assert.equal(
    matchItem(item({ catalog: "" }), sampleNotice, 0.9).kind,
    "possible",
  ));
test("different manufacturer cannot become exact", () =>
  assert.equal(
    matchItem(item({ manufacturer: "Other" }), sampleNotice, 1).kind,
    "missing",
  ));
test("missing manufacturer remains unresolved", () =>
  assert.equal(
    matchItem(item({ manufacturer: "" }), sampleNotice).kind,
    "missing",
  ));
test("normalization preserves zeros, punctuation and ambiguous letters", () => {
  for (const [a, b] of [
    ["00123", "123"],
    ["AB-12", "AB12"],
    ["R25O1", "R2501"],
    ["R25I1", "R2511"],
  ])
    assert.notEqual(identifier(a), identifier(b));
  assert.equal(identifier(" ab-12 "), "AB-12");
});
test("same catalog on two lines supports either exact paired lot", () => {
  const n = {
    ...sampleNotice,
    scope: [
      ...sampleNotice.scope,
      {
        catalog: "2C8632",
        lots: ["OTHER"],
        allLots: false,
        evidence: "2C8632 OTHER",
      },
    ],
  };
  assert.equal(matchItem(item({ lot: "OTHER" }), n).kind, "exact");
});
test("extractor keeps product-to-lot pairs intact", () => {
  const s = extractScope("Catalog: A; Lots: 111\nCatalog: B; Lots: 222");
  assert.deepEqual(
    s.map((r) => [r.catalog, r.lots]),
    [
      ["A", ["111"]],
      ["B", ["222"]],
    ],
  );
});
test("extractor abstains on ranges and exclusions", () => {
  for (const s of ["1 through 99", "1 to 99", "all lots except 3", "1..99"])
    assert.equal(extractScope("Catalog: X; Lots: " + s).length, 0);
});
test("source validation refuses fabricated or substring identifiers", () => {
  const n = {
    manufacturer: "Baxter",
    text: "Baxter Catalog: A; Lots: 1111",
    scope: [
      {
        catalog: "A",
        lots: ["111"],
        allLots: false,
        evidence: "Catalog: A; Lots: 1111",
      },
    ],
  };
  assert.match(validateScope(n) ?? "", /exactly/);
  n.scope[0].evidence = "made up";
  assert.match(validateScope(n) ?? "", /verbatim/);
});
test("all-lot scope needs clear source wording and no exclusions", () => {
  const n = {
    manufacturer: "Baxter",
    text: "Baxter A all lots except X",
    scope: [
      {
        catalog: "A",
        lots: [],
        allLots: true,
        evidence: "Baxter A all lots except X",
      },
    ],
  };
  assert.match(validateScope(n) ?? "", /unambiguous|match|pair/);
});
test("CSV preserves missing identifiers and quantities", () => {
  const data = parseCsv(SAMPLE_CSV);
  assert.equal(data.length, 8);
  assert.equal(
    data.reduce((a, i) => a + i.quantity, 0),
    218,
  );
  assert.equal(data[2].lot, "");
});
test("CSV supports BOM, CRLF, quoted commas and embedded newlines", () => {
  const data = parseCsv(
    '\uFEFFproduct,manufacturer,catalog,lot,quantity,location\r\n"Device, deluxe",Maker,C,L,2,"Room\nA"',
  );
  assert.equal(data[0].product, "Device, deluxe");
  assert.equal(data[0].location, "Room\nA");
});
test("CSV rejects malformed, duplicate, oversized and invalid inputs", () => {
  assert.throws(() => parseCsv("product,product\nx,y"), /duplicate/);
  assert.throws(
    () => parseCsv(SAMPLE_CSV + "\n" + SAMPLE_CSV.split("\n")[1]),
    /duplicate/,
  );
  assert.throws(
    () => parseCsv(SAMPLE_CSV.replace(",24,", ",0,")),
    /whole number/,
  );
  assert.throws(
    () => parseCsv(SAMPLE_CSV.replace(",24,", ",1.2,")),
    /whole number/,
  );
  assert.throws(() => parseCsv(SAMPLE_CSV + '\n"broken'), /unclosed/);
  assert.throws(() => parseCsv("x".repeat(500001)), /limit/);
});
test("CSV exports neutralize formulas and quote unsafe values", () => {
  const s = exportCsv([
    ['=HYPERLINK("evil")', " +1", "@SUM(A1)", "-2", "normal, value"],
  ]);
  assert.ok(s.includes("'=HYPERLINK"));
  assert.ok(s.includes("' +1"));
  assert.ok(s.includes("'@SUM"));
  assert.ok(s.includes('"normal, value"'));
});
test("unapproved source blocks direct action mutation", () =>
  assert.throws(
    () => reduceWorkspace(fixture(), action(), "Attacker"),
    /source/,
  ));
test("approval actor and timestamp are server inputs, extra client fields rejected", () => {
  assert.throws(() =>
    reduceWorkspace(
      fixture(),
      {
        type: "approve_notice",
        noticeId: "baxter-demo",
        sourceConfirmed: true,
        approvedBy: "Doctor",
      },
      "Real user",
    ),
  );
  const s = approve();
  assert.equal(s.notices[0].approvedBy, "Test reviewer");
});
test("assigned response is version-bound and attributed", () => {
  const s = reduceWorkspace(approve(), action(), "Operator");
  assert.equal(s.actions[0].updatedBy, "Operator");
  assert.equal(activeAction(s, "baxter-demo", "sample-1")?.status, "assigned");
});
test("cannot claim handled units before verification", () =>
  assert.throws(
    () =>
      reduceWorkspace(approve(), action({ handledQuantity: 1 }), "Operator"),
    /Verify/,
  ));
test("uncertain identifiers cannot be verified or completed", () =>
  assert.throws(
    () =>
      reduceWorkspace(
        approve(),
        action({
          itemId: "sample-3",
          status: "completed",
          verification: "Checked label and source",
          evidence: "Return record Q100",
          handledQuantity: 8,
        }),
        "Operator",
      ),
    /missing identifiers/,
  ));
test("completion rejects absent evidence, partial counts and excessive counts", () => {
  const a = {
    status: "completed",
    verification: "Checked physical label and current letter",
    handledQuantity: 24,
  };
  assert.throws(
    () => reduceWorkspace(approve(), action(a), "Operator"),
    /evidence/,
  );
  assert.throws(
    () =>
      reduceWorkspace(
        approve(),
        action({
          ...a,
          evidence: "Return receipt RMA-100",
          handledQuantity: 20,
        }),
        "Operator",
      ),
    /all recorded/,
  );
  assert.throws(
    () =>
      reduceWorkspace(
        approve(),
        action({
          ...a,
          evidence: "Return receipt RMA-100",
          handledQuantity: 25,
        }),
        "Operator",
      ),
    /exceed/,
  );
});
test("partial handling stays verified and full handling can complete", () => {
  const partial = reduceWorkspace(
    approve(),
    action({
      status: "verified",
      verification: "Checked label and current notice",
      evidence: "Isolated under Q-100",
      handledQuantity: 12,
    }),
    "Operator",
  );
  assert.equal(partial.actions[0].status, "verified");
  const done = reduceWorkspace(
    partial,
    action({
      status: "completed",
      verification: "Checked label and current notice",
      evidence: "Return receipt RMA-100",
      handledQuantity: 24,
    }),
    "Operator",
  );
  assert.equal(done.actions.length, 1);
  assert.equal(done.actions[0].status, "completed");
  assert.equal(done.audit.length, 4);
});
test("source edit invalidates approval and earlier responses", () => {
  const s = reduceWorkspace(approve(), action(), "Operator");
  const { id, title, manufacturer, date, sourceUrl, text, scope, training } =
    s.notices[0];
  const next = reduceWorkspace(
    s,
    {
      type: "save_notice",
      notice: {
        id,
        title,
        manufacturer,
        date,
        sourceUrl,
        text,
        scope,
        training,
        action:
          "Amended response summary from current manufacturer instructions.",
      },
    },
    "Editor",
  );
  assert.equal(next.notices[0].approvedAt, null);
  assert.equal(next.notices[0].version, 2);
  assert.equal(activeAction(next, id, "sample-1"), undefined);
  assert.equal(next.actions.length, 1);
});
test("inventory replacement cannot inherit completed responses", () => {
  const s = reduceWorkspace(approve(), action(), "Operator");
  const next = reduceWorkspace(
    s,
    { type: "import_inventory", csv: SAMPLE_CSV },
    "Editor",
  );
  assert.equal(activeAction(next, "baxter-demo", "sample-1"), undefined);
  assert.equal(next.inventoryVersion, 2);
  assert.equal(next.actions.length, 1);
  assert.equal(
    activeAction(next, "baxter-demo", next.inventory[0].id),
    undefined,
  );
});
test("reject unsafe source URLs and impossible dates", () => {
  const { id, approvedAt, approvedBy, version, ...n } = sampleNotice;
  assert.throws(() =>
    reduceWorkspace(
      fixture(),
      {
        type: "save_notice",
        notice: { ...n, sourceUrl: "javascript:alert(1)" },
      },
      "Editor",
    ),
  );
  assert.throws(() =>
    reduceWorkspace(approve(), action({ dueDate: "2026-02-30" }), "Editor"),
  );
});
test("unknown commands and actions on unrelated inventory are rejected", () => {
  assert.throws(() =>
    reduceWorkspace(fixture(), { type: "admin_override" }, "Attacker"),
  );
  assert.throws(
    () =>
      reduceWorkspace(
        approve(),
        action({ itemId: "other-user-item" }),
        "Attacker",
      ),
    /not found/,
  );
  assert.throws(
    () =>
      reduceWorkspace(approve(), action({ itemId: "sample-8" }), "Operator"),
    /no listed/,
  );
});

test("reject cross-pair support spanning two products", () => {
  const n = {
    manufacturer: "Baxter",
    text: "Baxter\nCatalog: A; Lots: 111\nCatalog: B; Lots: 222",
    scope: [
      {
        catalog: "A",
        lots: ["222"],
        allLots: false,
        evidence: "Catalog: A; Lots: 111\nCatalog: B; Lots: 222",
      },
    ],
  };
  assert.notEqual(validateScope(n), null);
});
test("qualified all-lot statements are unsupported", () => {
  for (const qualifier of [
    "manufactured before January 2024",
    "within serial range 10-20",
    "shipped after 2025",
  ]) {
    const evidence = "Catalog: A; Lots: all lots " + qualifier;
    assert.notEqual(
      validateScope({
        manufacturer: "Baxter",
        text: "Baxter\n" + evidence,
        scope: [{ catalog: "A", lots: [], allLots: true, evidence }],
      }),
      null,
    );
  }
});
test("manufacturer aliases remain in attention queue", () =>
  assert.equal(
    matchItem(
      item({ manufacturer: "Baxter Healthcare Corporation" }),
      sampleNotice,
      0.99,
    ).kind,
    "missing",
  ));
test("single-line correction preserves other actions and prior inventory snapshot", () => {
  let s = reduceWorkspace(approve(), action(), "Operator");
  const other = s.inventory[2];
  s = reduceWorkspace(
    s,
    {
      type: "correct_item",
      id: other.id,
      product: other.product,
      manufacturer: other.manufacturer,
      catalog: other.catalog,
      lot: "R25C31031",
      quantity: other.quantity,
      location: other.location,
    },
    "Editor",
  );
  assert.ok(activeAction(s, "baxter-demo", "sample-1"));
  assert.equal(s.inventoryHistory[0].items[2].lot, "");
  assert.equal(s.inventory[2].lot, "R25C31031");
});
test("source history preserves original evidence after edits", () => {
  const current = approve();
  const { approvedAt, approvedBy, version, ...n } = current.notices[0];
  const next = reduceWorkspace(
    current,
    {
      type: "save_notice",
      notice: { ...n, action: "A revised staff-entered response summary." },
    },
    "Editor",
  );
  assert.equal(next.noticeHistory[0].text, current.notices[0].text);
  assert.equal(next.noticeHistory[0].approvedBy, "Test reviewer");
});
