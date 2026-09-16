import express from "express";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { gzipSync, gunzipSync } from "node:zlib";
import { z } from "zod";
import { initialWorkspace } from "../lib/lotlight/sample";
import { reduceWorkspace } from "../lib/lotlight/commands";
import type { Workspace } from "../lib/lotlight/types";
const projectId = process.env.FIREBASE_PROJECT_ID || "lotlight-care";
initializeApp({ projectId });
const db = getFirestore();
const auth = getAuth();
const app = express();
const origins = new Set([
  "https://lotlight-care.web.app",
  "https://lotlight-care.firebaseapp.com",
  ...(process.env.NODE_ENV === "production"
    ? []
    : ["http://127.0.0.1:5190", "http://localhost:5190"]),
]);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  const origin = req.get("origin");
  if (origin && !origins.has(origin)) {
    res.status(403).json({ error: "Request origin rejected." });
    return;
  }
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "lotlight-api" }),
);
app.use(express.json({ limit: "600kb" }));
const envelope = z
  .object({ revision: z.number().int().min(0), command: z.unknown() })
  .strict();
const budgets = new Map<string, { start: number; count: number }>();
app.all("/api/workspace", async (req, res) => {
  if (!["GET", "POST"].includes(req.method)) {
    res
      .set("Allow", "GET, POST")
      .status(405)
      .json({ error: "Method not allowed." });
    return;
  }
  const token = req.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  let user;
  try {
    if (!token) throw Error("missing");
    user = await auth.verifyIdToken(token, true);
  } catch {
    res.status(401).json({ error: "Sign in to access your saved workspace." });
    return;
  }
  const now = Date.now(),
    budget = budgets.get(user.uid);
  if (budgets.size > 10000)
    for (const [id, b] of budgets)
      if (now - b.start > 60000) budgets.delete(id);
  if (budget && now - budget.start < 60000) {
    if (++budget.count > 90) {
      res
        .set("Retry-After", "60")
        .status(429)
        .json({ error: "Too many requests. Wait a minute and retry." });
      return;
    }
  } else budgets.set(user.uid, { start: now, count: 1 });
  const ref = db.collection("lotlightWorkspaces").doc(user.uid);
  try {
    if (req.method === "POST" && !req.get("origin")) {
      res.status(403).json({ error: "Request origin required." });
      return;
    }
    if (req.method === "POST" && !req.is("application/json")) {
      res.status(415).json({ error: "Use a JSON request." });
      return;
    }
    const payload = req.method === "POST" ? envelope.parse(req.body) : null;
    const state = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const current: Workspace = snapshot.exists
        ? JSON.parse(
            gunzipSync(snapshot.get("blob"), {
              maxOutputLength: 3_000_000,
            }).toString(),
          )
        : initialWorkspace();
      if (payload && payload.revision !== current.revision)
        throw Object.assign(
          new Error(
            "This workspace changed in another tab. Reload the latest version before saving.",
          ),
          { status: 409 },
        );
      let next: Workspace;
      try {
        next = payload
          ? reduceWorkspace(
              current,
              payload.command,
              user.name || user.email || "Account reviewer",
            )
          : current;
      } catch (error) {
        throw Object.assign(
          error instanceof Error ? error : new Error("Invalid update."),
          { status: 400 },
        );
      }
      if (payload || !snapshot.exists) {
        const serialized = JSON.stringify(next);
        if (Buffer.byteLength(serialized) > 3_000_000)
          throw Object.assign(
            new Error(
              "Workspace limit reached. Export your record before starting a fresh workspace.",
            ),
            { status: 413 },
          );
        const blob = gzipSync(serialized);
        if (blob.length > 900_000)
          throw Object.assign(
            new Error(
              "Workspace storage limit reached. Export before starting a fresh workspace.",
            ),
            { status: 413 },
          );
        tx.set(ref, {
          blob,
          revision: next.revision,
          updatedAt: new Date().toISOString(),
        });
      }
      return next;
    });
    res.json(state);
  } catch (e) {
    const err = e as Error & { status?: number; code?: number };
    const inputError = e instanceof z.ZodError;
    const status = err.status || (inputError ? 400 : 503);
    if (status === 503) console.error("workspace_failure", err.name, err.code);
    res.status(status).json({
      error:
        status === 503
          ? "Your saved workspace is unavailable. Retry without changing your inputs."
          : e instanceof z.ZodError
            ? e.issues.map((i) => i.message).join(" ")
            : err.message,
    });
  }
});
app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) =>
    res.status(err.status === 413 ? 413 : 400).json({
      error:
        err.status === 413
          ? "Request exceeds the size limit."
          : "Invalid JSON request.",
    }),
);
app.listen(Number(process.env.PORT || 5191), "0.0.0.0", () =>
  console.log("Lotlight API ready"),
);
