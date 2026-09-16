import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const b = await chromium.launch({ headless: true });
const context = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await context.newPage();
await p.goto(process.env.LOTLIGHT_TEST_URL ?? "http://localhost:5174");
await p.locator('main[data-ready="true"]').waitFor();
const result = await new AxeBuilder({ page: p })
  .withTags(["wcag2a", "wcag2aa"])
  .analyze();
console.log(
  JSON.stringify(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes
        .map((n) => ({ target: n.target, summary: n.failureSummary }))
        .slice(0, 25),
    })),
    null,
    2,
  ),
);
await b.close();
