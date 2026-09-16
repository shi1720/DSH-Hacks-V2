import { chromium } from "playwright";
import fs from "node:fs/promises";
const base = process.env.LOTLIGHT_TEST_URL ?? "http://localhost:5174";
await fs.mkdir(".artifact-build/video", { recursive: true });
const context = await chromium.launchPersistentContext(
  "/tmp/lotlight-ai-validation",
  {
    headless: true,
    viewport: { width: 1440, height: 1000 },
    recordVideo: {
      dir: ".artifact-build/video",
      size: { width: 1440, height: 1000 },
    },
  },
);
const page = context.pages()[0];
await page.goto(base);
await page.locator('main[data-ready="true"]').waitFor();
const start = Date.now();
const markers = [];
async function until(seconds) {
  const wait = seconds * 1000 - (Date.now() - start);
  if (wait > 0) await page.waitForTimeout(wait);
}
async function scene(seconds, name, fn) {
  await until(seconds);
  markers.push({ seconds, name });
  console.log("Scene", seconds, name);
  if (fn) await fn();
}
async function moveClick(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box)
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, {
      steps: 20,
    });
  await page.waitForTimeout(350);
  await locator.click();
}
try {
  await scene(0, "A notice is only the beginning");
  await scene(19, "Bring the inventory", async () => {
    await moveClick(
      page.getByRole("button", { name: "Inventory", exact: true }),
    );
    await moveClick(page.getByRole("button", { name: "Import CSV" }));
    await moveClick(
      page.getByRole("button", { name: "Use synthetic example" }),
    );
  });
  await scene(31, "Validate and import", async () => {
    await moveClick(page.getByRole("button", { name: "Validate & import" }));
  });
  await scene(39, "Review the original source", async () => {
    await moveClick(
      page.getByRole("button", { name: /Recall workspace/ }).first(),
    );
    await moveClick(
      page.getByRole("button", { name: "Open review", exact: true }),
    );
    await moveClick(page.getByRole("tab", { name: "Source & scope" }));
  });
  await scene(53, "Human source approval", async () => {
    await page.getByRole("checkbox").check();
    await moveClick(
      page.getByRole("button", { name: "Confirm source review" }),
    );
  });
  await scene(61, "AI finds an alias", async () => {
    await moveClick(page.getByRole("tab", { name: /Inventory review/ }));
    await moveClick(
      page.getByRole("button", { name: "Run local AI", exact: true }),
    );
    await page
      .getByText(/Semantic comparison complete/)
      .waitFor({ timeout: 120000 });
    await moveClick(
      page.getByRole("button", {
        name: "Show evidence for IV line extender in Mobile cart",
      }),
    );
  });
  await scene(79, "Exact identifiers and rationale", async () => {
    await moveClick(
      page.getByRole("button", {
        name: "Show evidence for CLEARLINK extension set in Infusion room",
      }),
    );
    await page
      .locator(".match-row")
      .filter({
        has: page.getByRole("button", {
          name: "Show evidence for CLEARLINK extension set in Infusion room",
        }),
      })
      .scrollIntoViewIfNeeded();
  });
  await scene(92, "Record a response", async () => {
    const row = page
      .locator(".match-row")
      .filter({
        has: page.getByRole("button", {
          name: "Show evidence for CLEARLINK extension set in Infusion room",
        }),
      });
    await moveClick(row.getByRole("button", { name: "Assign response" }));
    await page
      .getByLabel("Responsible person")
      .fill("Maya Rao · demo coordinator");
    await page.getByLabel("Response due date").fill("2026-09-18");
    await page.getByRole("combobox", { name: "Response stage" }).click();
    await page.getByRole("option", { name: /Completed/ }).click();
    await page
      .getByLabel("Physical-label and current-source verification")
      .fill(
        "Synthetic demo: checked physical catalog and lot labels against the original manufacturer letter.",
      );
    await page.getByLabel("Units handled").fill("24");
    await page
      .getByLabel("Response evidence / reference")
      .fill(
        "Synthetic demo evidence: isolation log Q-104 and supplier return reference RMA-210.",
      );
  });
  await scene(113, "Documented completion", async () => {
    await moveClick(
      page.getByRole("button", { name: "Save response", exact: true }),
    );
  });
  await scene(121, "Missing evidence stays open", async () => {
    await moveClick(
      page.getByRole("button", {
        name: "Show evidence for CLEARLINK extension set in Procedure room",
      }),
    );
    const row = page
      .locator(".match-row")
      .filter({
        has: page.getByRole("button", {
          name: "Show evidence for CLEARLINK extension set in Procedure room",
        }),
      });
    await moveClick(row.getByRole("button", { name: "Assign response" }));
    await page.getByRole("combobox", { name: "Response stage" }).click();
  });
  await scene(137, "Portable audit trail", async () => {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await moveClick(page.getByRole("button", { name: "Export record" }));
  });
  await scene(146, "Printable record", async () => {
    await moveClick(
      page.getByRole("button", { name: /Readable audit report/ }),
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  });
  await scene(156, "Business hypothesis and boundaries", async () => {
    await moveClick(page.getByRole("button", { name: "Evidence & approach" }));
    await page
      .getByRole("heading", { name: "A credible first customer" })
      .scrollIntoViewIfNeeded();
  });
  await scene(174, "Lotlight closing", async () => {
    await moveClick(
      page.getByRole("button", { name: /Recall workspace/ }).first(),
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  });
  await until(185);
  const videoPath = await page.video().path();
  await context.close();
  await fs.copyFile(videoPath, ".artifact-build/video/lotlight-demo.webm");
  await fs.writeFile(
    "submission/VIDEO-TIMING.json",
    JSON.stringify({ durationSeconds: 185, markers }, null, 2),
  );
  console.log("Recorded .artifact-build/video/lotlight-demo.webm");
} catch (e) {
  await context.close();
  throw e;
}
