type CapturedTool = {
  name: string;
  execute(input: unknown): { inventoryLines: number };
};
declare global {
  interface Window { capturedTools: CapturedTool[]; }
}
import { test, expect } from "@playwright/test";
import { SAMPLE_CSV } from "../../lib/lotlight/sample";
async function ready(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('main[data-ready="true"]').waitFor();
}
async function approve(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Open review", exact: true })
    .first()
    .click();
  await page.getByRole("tab", { name: "Source & scope" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm source review" }).click();
  await expect(
    page.getByText("Source review recorded", { exact: true }),
  ).toBeVisible();
}
test("full demo: gated source, staff response, export and unknown cannot complete", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Open review", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Show evidence for CLEARLINK extension set in Infusion room",
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Assign response" }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Source & scope" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm source review" }).click();
  await page.getByRole("tab", { name: /Inventory review/ }).click();
  await page
    .getByRole("button", {
      name: "Show evidence for CLEARLINK extension set in Infusion room",
    })
    .click();
  await page.getByRole("button", { name: "Assign response" }).click();
  await page.getByLabel("Responsible person").fill("Maya Rao");
  await page.getByRole("combobox", { name: "Response stage" }).click();
  await page.getByRole("option", { name: /Completed/ }).click();
  await page
    .getByLabel("Physical-label and current-source verification")
    .fill(
      "Checked 24 physical labels against the full manufacturer source in this synthetic demonstration.",
    );
  await page.getByLabel("Units handled").fill("24");
  await page
    .getByLabel("Response evidence / reference")
    .fill(
      "Synthetic training record: isolation log Q-104 and supplier return reference RMA-210.",
    );
  await page
    .getByRole("button", { name: "Save response", exact: true })
    .click();
  await expect(
    page.getByText("Response complete", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Show evidence for CLEARLINK extension set in Procedure room",
    })
    .click();
  await page
    .getByRole("button", { name: "Assign response", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Response stage" }).click();
  await expect(page.getByRole("option", { name: /Completed/ })).toHaveAttribute(
    "data-disabled",
    "",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Export record" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /Complete audit record/ }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("lotlight-audit-record.json");
  const stream = await file.createReadStream();
  let output = "";
  for await (const chunk of stream!) output += chunk;
  const exported = JSON.parse(output);
  expect(exported.payload.workspace.actions[0].handledQuantity).toBe(24);
  expect(exported.payload.inventoryProvenance).toBe("synthetic");
  expect(exported.integrity.digest).toHaveLength(64);
});
test("CSV errors preserve draft, import works, corrections preserve provenance", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByRole("button", { name: "Import CSV" }).click();
  await page
    .getByLabel("Inventory CSV", { exact: true })
    .fill(SAMPLE_CSV.replace(",24,", ",-2,"));
  await page.getByRole("button", { name: "Validate & import" }).click();
  await expect(page.getByRole("alert")).toContainText("whole number");
  await page.getByRole("button", { name: "Use synthetic example" }).click();
  await page.getByRole("button", { name: "Validate & import" }).click();
  await expect(page.getByText(/synthetic · 8 lines/)).toBeVisible();
  await page
    .getByRole("button", {
      name: "Correct CLEARLINK extension set in Procedure room",
    })
    .click();
  await page.getByLabel("Lot", { exact: true }).fill("R25C31031");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByText("R25C31031", { exact: true })).toHaveCount(2);
});
test("new source form resets after success; unsupported source pairing rejected", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "New recall review" }).click();
  await page
    .getByRole("button", { name: "Use historical training extract" })
    .click();
  await page.getByRole("button", { name: "Save for source review" }).click();
  await expect(
    page.getByRole("button", { name: "Open review", exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "New recall review" }).click();
  await expect(page.getByLabel("Product / review title")).toHaveValue("");
});
test("local sign-in, account persistence, stale revision and origin rejection", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.LOTLIGHT_FIREBASE === "1",
    "Sites-only development auth test",
  );
  await ready(page);
  expect((await request.get("/api/workspace")).status()).toBe(401);
  await page.getByRole("link", { name: "Sign in to save" }).click();
  await expect(
    page.getByText("Account storage", { exact: true }),
  ).toBeVisible();
  const reset = await page.evaluate(async () => {
    const s = (await (await fetch("/api/workspace")).json()) as {
      revision: number;
    };
    const r = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: s.revision,
        command: { type: "reset_demo" },
      }),
    });
    return r.status;
  });
  expect(reset).toBe(200);
  await page.reload();
  await page.locator('main[data-ready="true"]').waitFor();
  await expect(
    page.getByText("Account storage", { exact: true }),
  ).toBeVisible();
  await approve(page);
  await page.reload();
  await page.locator('main[data-ready="true"]').waitFor();
  await expect(
    page.getByText("SOURCE REVIEWED", { exact: true }),
  ).toBeVisible();
  const status = await page.evaluate(async () => {
    const s = (await (await fetch("/api/workspace")).json()) as {
      revision: number;
    };
    const r = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: s.revision - 1,
        command: { type: "reset_demo" },
      }),
    });
    return r.status;
  });
  expect(status).toBe(409);
  const bad = await page.request.post("/api/workspace", {
    headers: {
      Origin: "https://evil.example",
      "Content-Type": "application/json",
    },
    data: { revision: 0, command: { type: "reset_demo" } },
  });
  expect(bad.status()).toBe(403);
  await page.getByRole("link", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in to save" }),
  ).toBeVisible();
  expect((await page.request.get("/api/workspace")).status()).toBe(401);
});
test("mobile workflow fits viewport and retains navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open review", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run local AI" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Your inventory." }),
  ).toBeVisible();
});
test("WebMCP read tool handles valid and invalid input without mutation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.capturedTools = [];
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool(tool: CapturedTool) {
          window.capturedTools.push(tool);
        },
      },
    });
  });
  await ready(page);
  const result = await page.evaluate(() => {
    const tool = window.capturedTools.at(-1);
    if (!tool) throw new Error("The review tool was not registered");
    const good = tool.execute({});
    let rejected = false;
    try {
      tool.execute({ extra: 1 });
    } catch {
      rejected = true;
    }
    return { name: tool.name, good, rejected };
  });
  expect(result.name).toBe("lotlight_read_review");
  expect(result.good.inventoryLines).toBe(8);
  expect(result.rejected).toBe(true);
});

test("text-based PDF notice import preserves text and extracts explicit pairs", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "New recall review" }).click();
  await page
    .getByLabel("Upload recall notice")
    .setInputFiles("public/samples/baxter-training-extract.pdf");
  await expect(
    page.getByLabel("Original notice text / clearly labeled training extract"),
  ).toContainText("R25C31031");
  await expect(page.getByLabel("Catalog", { exact: true })).toHaveCount(2);
});
