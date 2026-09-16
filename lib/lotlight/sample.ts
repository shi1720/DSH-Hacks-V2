import type { Workspace, Notice } from "./types";
export const BAXTER_URL =
  "https://www.medline.com/media/assets/pdf/vendor-list/FA-2025-039-Customer-Letter-Final-Combined.pdf";
export const SAMPLE_NOTICE_TEXT = `TRAINING EXTRACT — paraphrased from Baxter manufacturer notice FA-2025-039, dated 2025-08-29. This is a historical demonstration, not a current safety notice. Consult the full original notice for every affected product and instruction. Only two catalog/lot pairs are included here.
Manufacturer: Baxter
Product: CLEARLINK IV extension and solution sets
Catalog: 2C8632; Lots: R25C31031
Catalog: 2R8858; Lots: R25A13024
Reason (paraphrase): A potential leak can compromise delivery and introduce risks during use.
Manufacturer wording: “Immediately locate, isolate, and cease all use of the affected product.”
Response (paraphrase): Identify stock, follow the supplier-specific return or replacement route, and acknowledge the notice. Direct-purchase and distributor-purchase response routes differ.
Source: ${BAXTER_URL}`;
export const SAMPLE_CSV = `product,manufacturer,catalog,lot,quantity,location
CLEARLINK extension set,Baxter,2C8632,R25C31031,24,Infusion room
CLEARLINK solution set,Baxter,2R8858,R25A13024,12,Main stockroom
CLEARLINK extension set,Baxter,2C8632,,8,Procedure room
IV line extender,Baxter,,,6,Mobile cart
CLEARLINK extension set,Baxter,2C8632,R24Z99999,18,Main stockroom
CLEARLINK solution set,Baxter,2R8858,R24Z88888,10,Infusion room
Sterile gauze,Demo Supply Co,GAUZE-4,G202601,40,Procedure room
Examination gloves,Demo Supply Co,GLV-M,G202602,100,Main stockroom`;
export const sampleNotice: Notice = {
  id: "baxter-demo",
  title: "CLEARLINK IV sets",
  manufacturer: "Baxter",
  date: "2025-08-29",
  sourceUrl: BAXTER_URL,
  text: SAMPLE_NOTICE_TEXT,
  action:
    "Identify affected stock and follow the manufacturer’s supplier-specific isolation, return or replacement, and acknowledgement instructions. Verify the current full notice first.",
  scope: [
    {
      catalog: "2C8632",
      lots: ["R25C31031"],
      allLots: false,
      evidence: "Catalog: 2C8632; Lots: R25C31031",
    },
    {
      catalog: "2R8858",
      lots: ["R25A13024"],
      allLots: false,
      evidence: "Catalog: 2R8858; Lots: R25A13024",
    },
  ],
  version: 1,
  training: true,
  approvedBy: null,
  approvedAt: null,
};
export function initialWorkspace(): Workspace {
  const lines = SAMPLE_CSV.split("\n").slice(1);
  return {
    inventoryProvenance: "synthetic",
    noticeHistory: [],
    inventoryHistory: [],
    inventory: lines.map((line, i) => {
      const [product, manufacturer, catalog, lot, quantity, location] =
        line.split(",");
      return {
        id: `sample-${i + 1}`,
        product,
        manufacturer,
        catalog,
        lot,
        quantity: Number(quantity),
        location,
      };
    }),
    inventoryVersion: 1,
    notices: [structuredClone(sampleNotice)],
    actions: [],
    audit: [
      {
        id: "initial",
        at: "2026-09-16T00:00:00.000Z",
        actor: "Lotlight demo",
        type: "workspace.created",
        detail:
          "Historical Baxter training extract loaded with synthetic inventory. No current recall status is implied.",
      },
    ],
    revision: 0,
    savedAt: null,
  };
}
