import { getChatGPTUser } from "@/app/chatgpt-auth";
import { readWorkspace, writeWorkspace } from "@/lib/lotlight/storage";
import { reduceWorkspace } from "@/lib/lotlight/commands";
import { z } from "zod";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user)
    return reply({ error: "Sign in to access a saved workspace." }, 401);
  try {
    return reply(await readWorkspace(user.userId));
  } catch (error) {
    console.error(
      "workspace_read_failed",
      error instanceof Error ? error.name : "unknown",
    );
    return reply(
      {
        error:
          "Your saved workspace is unavailable. Retry without changing your inputs.",
      },
      503,
    );
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return reply({ error: "Sign in to save your workspace." }, 401);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return reply({ error: "Request origin rejected." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "Use a JSON request." }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 600000)
    return reply({ error: "Request exceeds the size limit." }, 413);
  let payload: { revision: number; command?: unknown };
  try {
    const body = await request.text();
    if (body.length > 600000)
      return reply({ error: "Request exceeds the size limit." }, 413);
    payload = z
      .object({ revision: z.number().int().min(0), command: z.unknown() })
      .strict()
      .parse(JSON.parse(body));
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  try {
    const state = await readWorkspace(user.userId);
    if (state.revision !== payload.revision)
      return reply(
        {
          error:
            "This workspace changed in another tab. Reload the latest version before saving.",
        },
        409,
      );
    let next;
    try {
      next = reduceWorkspace(state, payload.command, user.displayName);
    } catch (error) {
      return reply(
        {
          error:
            error instanceof z.ZodError
              ? error.issues.map((i) => i.message).join(" ")
              : error instanceof Error
                ? error.message
                : "Invalid update.",
        },
        400,
      );
    }
    if (JSON.stringify(next).length > 3000000)
      return reply(
        {
          error:
            "Workspace storage limit reached. Export your audit record before starting a new workspace.",
        },
        413,
      );
    if (!(await writeWorkspace(user.userId, payload.revision, next)))
      return reply(
        { error: "Another update arrived first. Reload before retrying." },
        409,
      );
    return reply(next);
  } catch (error) {
    console.error(
      "workspace_save_failed",
      error instanceof Error ? error.name : "unknown",
    );
    return reply(
      {
        error:
          "Could not save. Your previous saved version is intact. Please retry.",
      },
      503,
    );
  }
}
