import { env } from "cloudflare:workers";
import { initialWorkspace } from "./sample";
import type { Workspace } from "./types";
export function database() {
  if (!env.DB)
    throw new Error(
      "Persistent storage is temporarily unavailable. Please retry.",
    );
  return env.DB;
}
export async function readWorkspace(ownerId: string): Promise<Workspace> {
  const db = database();
  const row = await db
    .prepare("SELECT state FROM workspaces WHERE owner_id = ?")
    .bind(ownerId)
    .first<{ state: string }>();
  if (row) return JSON.parse(row.state) as Workspace;
  const state = initialWorkspace();
  await db
    .prepare(
      "INSERT OR IGNORE INTO workspaces (owner_id, state, revision, updated_at) VALUES (?, ?, ?, ?)",
    )
    .bind(ownerId, JSON.stringify(state), 0, new Date().toISOString())
    .run();
  const saved = await db
    .prepare("SELECT state FROM workspaces WHERE owner_id = ?")
    .bind(ownerId)
    .first<{ state: string }>();
  if (!saved)
    throw new Error("Could not initialize your workspace. Please retry.");
  return JSON.parse(saved.state);
}
export async function writeWorkspace(
  ownerId: string,
  expectedRevision: number,
  state: Workspace,
) {
  const result = await database()
    .prepare(
      "UPDATE workspaces SET state = ?, revision = ?, updated_at = ? WHERE owner_id = ? AND revision = ?",
    )
    .bind(
      JSON.stringify(state),
      state.revision,
      state.savedAt,
      ownerId,
      expectedRevision,
    )
    .run();
  return result.meta.changes === 1;
}
