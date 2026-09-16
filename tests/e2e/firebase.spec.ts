import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const config = JSON.parse(
  readFileSync(
    new URL("../../public/firebase-config.json", import.meta.url),
    "utf8",
  ),
);
const enabled = process.env.LOTLIGHT_FIREBASE === "1";
test.skip(!enabled, "Firebase release checks only");
test.setTimeout(90000);
const expectCloud = expect.configure({ timeout: 20000 });
const origin = "https://lotlight-care.web.app";
async function identity(method: string, body: unknown) {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return { status: r.status, data: (await r.json()) as any };
}
test("Firebase API isolates accounts and enforces workflow, origin and revision gates", async () => {
  const accounts: any[] = [];
  async function account() {
    const r = await identity("signUp", {
      email: `lotlight-qa-${randomUUID()}@example.invalid`,
      password: randomUUID() + "Strong!",
      returnSecureToken: true,
    });
    expect(r.status).toBe(200);
    accounts.push(r.data);
    return r.data.idToken;
  }
  async function api(token: string, body?: unknown, source = origin) {
    return fetch(config.apiBase + "/api/workspace", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        Origin: source,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  try {
    expect((await api("invalid")).status).toBe(401);
    const a = await account(),
      b = await account();
    const ar = await api(a);
    expect(ar.status).toBe(200);
    const s = (await ar.json()) as any;
    const br = await api(b);
    expect(br.status).toBe(200);
    const cmd = {
      revision: s.revision,
      command: {
        type: "approve_notice",
        noticeId: "baxter-demo",
        sourceConfirmed: true,
      },
    };
    expect((await api(a, cmd, "https://other.example")).status).toBe(403);
    expect((await api(a, { ...cmd, actor: "forged" })).status).toBe(400);
    const approved = await api(a, cmd);
    expect(approved.status).toBe(200);
    expect((await api(a, cmd)).status).toBe(409);
    const bs = (await (await api(b)).json()) as any;
    expect(bs.notices[0].approvedAt).toBeNull();
    expect(
      (
        await api(a, {
          revision: s.revision + 1,
          command: {
            type: "save_action",
            noticeId: "baxter-demo",
            itemId: "sample-3",
            owner: "Test reviewer",
            dueDate: "2026-10-01",
            status: "completed",
            verification: "Label check for synthetic test only",
            evidence: "Synthetic evidence",
            handledQuantity: 8,
          },
        })
      ).status,
    ).toBe(400);
  } finally {
    for (const a of accounts) await identity("delete", { idToken: a.idToken });
  }
});
test("Firebase account creation, save, reload, sign out and sign back in", async ({
  page,
}) => {
  const email = `lotlight-ui-${randomUUID()}@example.invalid`,
    password = randomUUID() + "Strong!";
  let token: string | undefined;
  try {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in to save" }).click();
    await page
      .getByRole("button", { name: "New here? Create an account" })
      .click();
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expectCloud(
      page.getByText("Account storage", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Open review", exact: true })
      .click();
    await page.getByRole("tab", { name: "Source & scope" }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirm source review" }).click();
    await expectCloud(
      page.getByText("Source review recorded", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", { name: "Open review", exact: true })
      .click();
    await page.getByRole("tab", { name: "Source & scope" }).click();
    await expectCloud(
      page.getByText("Source review recorded", { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Sign out", exact: true }).click();
    await page.getByRole("link", { name: "Sign in to save" }).click();
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expectCloud(
      page.getByText("Account storage", { exact: true }),
    ).toBeVisible();
    await page.route("**/api/workspace", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": origin },
        body: JSON.stringify({ error: "Test connection failure" }),
      }),
    );
    await page.reload();
    await expectCloud(
      page.getByRole("heading", {
        name: "Your saved workspace could not open",
      }),
    ).toBeVisible();
    await expectCloud(
      page.getByRole("button", { name: "Open review", exact: true }),
    ).toHaveCount(0);
  } finally {
    const a = await identity("signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
    token = a.data.idToken;
    if (token) await identity("delete", { idToken: token });
  }
});

test('Firebase sign-in dialog is accessible and mobile sized',async({page})=>{
 const {default:AxeBuilder}=await import('@axe-core/playwright');
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('link',{name:'Sign in to save'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();const result=await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa']).analyze();expect(result.violations).toEqual([]);
 const size=await page.getByRole('dialog').boundingBox();expect(size!.width).toBeLessThanOrEqual(390);
});

test('configuration outage presents a retry screen instead of a blank page', async ({page}) => {
  await page.route('**/firebase-config.json', route => route.fulfill({status:503,body:'Unavailable'}));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Lotlight could not load'})).toBeVisible();
  await page.unroute('**/firebase-config.json');
  await page.getByRole('button',{name:'Retry loading'}).click();
  await expect(page.getByRole('button',{name:'Open review',exact:true})).toBeVisible();
});

test('deleted account tokens cannot reopen saved workspaces', async () => {
  const a = await identity('signUp',{email:`lotlight-qa-${randomUUID()}@example.invalid`,password:randomUUID()+'Strong!',returnSecureToken:true});
  expect(a.status).toBe(200);
  const token = a.data.idToken;
  expect((await identity('delete',{idToken:token})).status).toBe(200);
  const response = await fetch(config.apiBase+'/api/workspace',{headers:{Authorization:'Bearer '+token,Origin:origin}});
  expect(response.status).toBe(401);
});
