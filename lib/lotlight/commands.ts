import { z } from "zod";
import { parseCsv, validateScope, matchItem, inventoryKey } from "./engine";
import { initialWorkspace } from "./sample";
import type { Workspace, ResponseAction } from "./types";
const short = z.string().trim().min(1).max(200);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Use a valid calendar date.",
  );
const scopeSchema = z
  .object({
    catalog: short,
    lots: z.array(short).max(100),
    allLots: z.boolean(),
    evidence: z.string().trim().min(1).max(5000),
  })
  .strict();
const noticeInput = z
  .object({
    id: z.string().max(100).optional(),
    title: short,
    manufacturer: short,
    date: isoDate,
    sourceUrl: z
      .string()
      .url()
      .max(1500)
      .refine(
        (s) => new URL(s).protocol === "https:",
        "Use an HTTPS source URL.",
      ),
    text: z.string().trim().min(20).max(50000),
    action: z.string().trim().min(15).max(2000),
    scope: z.array(scopeSchema).min(1).max(40),
    training: z.boolean(),
  })
  .strict();
export const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("import_inventory"),
      csv: z.string().max(500000),
      synthetic: z.boolean().optional(),
    })
    .strict(),
  z.object({ type: z.literal("save_notice"), notice: noticeInput }).strict(),
  z
    .object({
      type: z.literal("correct_item"),
      id: short,
      product: short,
      manufacturer: z.string().trim().max(200),
      catalog: z.string().trim().max(200),
      lot: z.string().trim().max(200),
      quantity: z.number().int().min(1).max(1000000),
      location: short,
    })
    .strict(),
  z
    .object({
      type: z.literal("approve_notice"),
      noticeId: short,
      sourceConfirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      type: z.literal("save_action"),
      noticeId: short,
      itemId: short,
      owner: z.string().trim().min(2).max(100),
      dueDate: isoDate,
      status: z.enum(["assigned", "verified", "completed"]),
      verification: z.string().trim().max(2000),
      evidence: z.string().trim().max(2000),
      handledQuantity: z.number().int().min(0).max(1000000),
    })
    .strict(),
  z.object({ type: z.literal("reset_demo") }).strict(),
  z.object({ type: z.literal("clear_workspace") }).strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export function activeAction(
  state: Workspace,
  noticeId: string,
  itemId: string,
): ResponseAction | undefined {
  const notice = state.notices.find((n) => n.id === noticeId);
  const item = state.inventory.find((i) => i.id === itemId);
  if (!notice || !item) return undefined;
  return state.actions.find(
    (a) =>
      a.noticeId === noticeId &&
      a.itemId === itemId &&
      a.noticeVersion === notice?.version &&
      (a.itemVersion ?? 1) === (item?.version ?? 1),
  );
}
export function reduceWorkspace(
  current: Workspace,
  untrusted: unknown,
  actor: string,
  now = new Date().toISOString(),
): Workspace {
  const cmd = commandSchema.parse(untrusted);
  let next = structuredClone(current);
  next.noticeHistory ??= [];
  next.inventoryHistory ??= [];
  next.inventoryProvenance ??= "synthetic";
  let detail = "";
  if (current.audit.length >= 2000 && cmd.type !== "clear_workspace")
    throw new Error(
      "Workspace audit limit reached. Export your record before starting a fresh workspace.",
    );
  if (cmd.type === "reset_demo") {
    next = initialWorkspace();
    next.audit = current.audit;
    next.inventoryVersion = current.inventoryVersion + 1;
    detail =
      "Started a new synthetic demonstration. Prior activity remains in the audit log; export detailed case records before resetting.";
  }
  if (cmd.type === "clear_workspace") {
    next = {
      inventory: [],
      inventoryProvenance: "user-supplied",
      noticeHistory: [],
      inventoryHistory: [],
      inventoryVersion: current.inventoryVersion + 1,
      notices: [],
      actions: [],
      audit: [],
      revision: current.revision,
      savedAt: null,
    };
    detail =
      "Started an empty workspace. Earlier records were removed at the account holder’s request.";
  }
  if (cmd.type === "import_inventory") {
    next.inventoryHistory.push({
      version: next.inventoryVersion,
      items: structuredClone(next.inventory),
      provenance: next.inventoryProvenance,
    });
    next.inventory = parseCsv(cmd.csv);
    next.inventoryProvenance = cmd.synthetic ? "synthetic" : "user-supplied";
    next.inventoryVersion++;
    detail = `Imported ${next.inventory.length} inventory lines as revision ${next.inventoryVersion}. Prior response actions are historical and do not close new inventory obligations.`;
  }
  if (cmd.type === "correct_item") {
    const old = next.inventory.find((i) => i.id === cmd.id);
    if (!old) throw new Error("Inventory line not found.");
    if (
      next.inventory.some(
        (i) => i.id !== cmd.id && inventoryKey(i) === inventoryKey(cmd),
      )
    )
      throw new Error(
        "Duplicate inventory line. Combine quantities before importing, or correct the existing record.",
      );
    next.inventoryHistory.push({
      version: next.inventoryVersion,
      items: structuredClone(next.inventory),
      provenance: next.inventoryProvenance,
    });
    next.inventoryVersion++;
    const { type, ...fields } = cmd;
    next.inventory = next.inventory.map((i) =>
      i.id === cmd.id ? { ...fields, version: (old.version ?? 1) + 1 } : i,
    );
    detail = `Corrected ${old.product} at ${old.location}. Item revision ${(old.version ?? 1) + 1}, inventory revision ${next.inventoryVersion}. This line’s responses require fresh review; other unchanged lines retain their response state.`;
  }
  if (cmd.type === "save_notice") {
    const error = validateScope(cmd.notice);
    if (error) throw new Error(error);
    const existing = cmd.notice.id
      ? next.notices.find((n) => n.id === cmd.notice.id)
      : undefined;
    if (cmd.notice.id && !existing) throw new Error("Notice not found.");
    if (!existing && next.notices.length >= 20)
      throw new Error("This workspace supports up to 20 notices.");
    if (existing) next.noticeHistory.push(structuredClone(existing));
    const notice = {
      ...cmd.notice,
      id: existing?.id ?? crypto.randomUUID(),
      version: (existing?.version ?? 0) + 1,
      approvedBy: null,
      approvedAt: null,
    };
    next.notices = existing
      ? next.notices.map((n) => (n.id === existing.id ? notice : n))
      : [notice, ...next.notices];
    detail = `${existing ? "Updated" : "Added"} notice “${notice.title}”, version ${notice.version}. Source approval is required. Earlier version actions remain historical.`;
  }
  if (cmd.type === "approve_notice") {
    const notice = next.notices.find((n) => n.id === cmd.noticeId);
    if (!notice) throw new Error("Notice not found.");
    const error = validateScope(notice);
    if (error) throw new Error(error);
    notice.approvedBy = actor;
    notice.approvedAt = now;
    detail = `Staff confirmed source and paired scope for “${notice.title}” version ${notice.version}${notice.training ? " in a training scenario" : ""}. This is staff attestation, not independent verification.`;
  }
  if (cmd.type === "save_action") {
    const notice = next.notices.find((n) => n.id === cmd.noticeId);
    const item = next.inventory.find((i) => i.id === cmd.itemId);
    if (!notice || !item)
      throw new Error("Notice or inventory line not found.");
    if (!notice.approvedAt)
      throw new Error(
        "Review and confirm the notice source before assigning a response.",
      );
    const match = matchItem(item, notice);
    if (match.kind === "unlisted")
      throw new Error(
        "This line has no listed identifier match in this notice.",
      );
    if (cmd.handledQuantity > item.quantity)
      throw new Error("Handled quantity cannot exceed recorded stock.");
    if (cmd.status !== "assigned") {
      if (match.kind !== "exact")
        throw new Error(
          "Resolve missing identifiers in the inventory before recording verification or completion.",
        );
      if (cmd.verification.length < 12)
        throw new Error(
          "Record how you checked the physical label and current manufacturer instructions (at least 12 characters).",
        );
    }
    if (cmd.status === "assigned" && cmd.handledQuantity !== 0)
      throw new Error(
        "Verify the physical label before recording handled units.",
      );
    if (cmd.handledQuantity > 0 && cmd.evidence.length < 12)
      throw new Error(
        "Record response evidence and a supporting reference for handled units (at least 12 characters).",
      );
    if (
      cmd.status === "completed" &&
      (cmd.handledQuantity !== item.quantity || cmd.evidence.length < 12)
    )
      throw new Error(
        "Completion requires all recorded units handled and a response evidence reference.",
      );
    const existing = activeAction(next, notice.id, item.id);
    const action: ResponseAction = {
      id: existing?.id ?? crypto.randomUUID(),
      noticeId: notice.id,
      noticeVersion: notice.version,
      itemId: item.id,
      inventoryVersion: next.inventoryVersion,
      itemVersion: item.version ?? 1,
      itemLabel: `${item.product} · ${item.catalog || "no catalog"} · ${item.lot || "no lot"} · ${item.location}`,
      owner: cmd.owner,
      dueDate: cmd.dueDate,
      status: cmd.status,
      verification: cmd.verification,
      evidence: cmd.evidence,
      handledQuantity: cmd.handledQuantity,
      updatedAt: now,
      updatedBy: actor,
    };
    next.actions = existing
      ? next.actions.map((a) => (a.id === existing.id ? action : a))
      : [action, ...next.actions];
    detail = `${cmd.status === "completed" ? "Response recorded as complete" : cmd.status === "verified" ? "Physical verification recorded" : "Response assigned"}: ${action.itemLabel}. Owner: ${action.owner}. Handled ${cmd.handledQuantity}/${item.quantity}. Verification: ${cmd.verification || "pending"}. Evidence: ${cmd.evidence || "pending"}.`;
  }
  next.revision = current.revision + 1;
  next.savedAt = now;
  next.audit.push({
    id: crypto.randomUUID(),
    at: now,
    actor,
    type: cmd.type,
    detail,
  });
  return next;
}
