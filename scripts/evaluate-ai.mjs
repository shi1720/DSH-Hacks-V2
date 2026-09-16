import { chromium } from "playwright";
import fs from "node:fs/promises";
const context = await chromium.launchPersistentContext(
  "/tmp/lotlight-ai-validation",
  { headless: true, viewport: { width: 1440, height: 1000 } },
);
const page = context.pages()[0];
page.on('console',m=>console.log(m.type(),m.text().slice(0,200)));
page.on('requestfailed',r=>console.log('request failed',r.url(),r.failure()));
try {
  await page.goto(process.env.LOTLIGHT_TEST_URL ?? "http://localhost:5174");
  await page.locator('main[data-ready="true"]').waitFor();
  const query = "Baxter CLEARLINK IV extension and solution sets";
  const cases = [
    { id: "alias-1", product: "IV line extender", relevant: true },
    {
      id: "alias-2",
      product: "Intravenous fluid administration tubing",
      relevant: true,
    },
    {
      id: "alias-3",
      product: "Extension tubing for infusion line",
      relevant: true,
    },
    {
      id: "alias-4",
      product: "IV solution administration set",
      relevant: true,
    },
    { id: "literal-1", product: "CLEARLINK extension set", relevant: true },
    { id: "literal-2", product: "CLEARLINK solution set", relevant: true },
    { id: "negative-1", product: "Examination gloves", relevant: false },
    { id: "negative-2", product: "Sterile gauze dressing", relevant: false },
    { id: "negative-3", product: "Digital thermometer", relevant: false },
    { id: "negative-4", product: "Wheelchair footrest", relevant: false },
    { id: "negative-5", product: "Blood glucose test strips", relevant: false },
    { id: "negative-6", product: "Urine collection cup", relevant: false },
  ];
  const start = Date.now();
  const scores = await page.evaluate(
    ({ query, cases }) =>
      new Promise((resolve, reject) => {
        const w = new Worker("/ai/semantic-worker.js", { type: "module" });
        const timeout = setTimeout(() => {
          w.terminate();
          reject(new Error("Model evaluation exceeded 180 seconds"));
        }, 180000);
        w.onmessage = (e) => {

          if (e.data.type === "result") {
            clearTimeout(timeout);
            w.terminate();
            resolve(e.data.scores);
          }
          if (e.data.type === "error") {
            clearTimeout(timeout);
            w.terminate();
            reject(new Error(e.data.message));
          }
        };
        w.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error(e.message));
        };
        w.postMessage({ query, items: cases });
      }),
    { query, cases },
  );
  const ranked = cases
    .map((c) => ({
      ...c,
      similarity: scores[c.id],
      lexical: query
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
        .some((w) => c.product.toLowerCase().includes(w)),
    }))
    .sort((a, b) => b.similarity - a.similarity);
  const relevant = cases.filter((c) => c.relevant).length;
  const report = {
    date: new Date().toISOString(),
    model: "Xenova/all-MiniLM-L6-v2",
    revision: "751bff37182d3f1213fa05d7196b954e230abad9",
    dtype: "q8",
    runtime: "actual Chromium browser / WASM",
    query,
    total: cases.length,
    relevant,
    elapsedIncludingModelLoadMs: Date.now() - start,
    lexicalRecall:
      ranked.filter((c) => c.relevant && c.lexical).length / relevant,
    semanticTop6Recall:
      ranked.slice(0, 6).filter((c) => c.relevant).length / relevant,
    candidateThreshold: 0.3,
    thresholdRelevant: ranked.filter((c) => c.relevant && c.similarity >= 0.3)
      .length,
    thresholdFalseCandidates: ranked.filter(
      (c) => !c.relevant && c.similarity >= 0.3,
    ).length,
    limitations:
      "Hand-authored synthetic smoke/ranking set, one query. Not clinical validation or an unbiased held-out benchmark. Labels and threshold not independently adjudicated.",
    ranked,
  };
  await fs.writeFile(
    "docs/ai-evaluation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  await page.getByRole("button", { name: "Open review", exact: true }).click();
  await page.getByRole("button", { name: "Run local AI", exact: true }).click();
  await page
    .getByText(/Semantic comparison complete/)
    .waitFor({ timeout: 120000 });
  await page.screenshot({ path: "docs/images/ai-review.png", fullPage: true });
} finally {
  await context.close();
}
