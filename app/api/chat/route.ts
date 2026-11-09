import { streamText } from "ai";
import { buildChatInstructions } from "@/lib/ai/chat-prompt";
import { getChatModel } from "@/lib/ai/model";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { chatRequestSchema } from "@/lib/validations/chat";

const RESPONSE_TIMEOUT_MS = 30_000;
const MAX_ANSWER_TOKENS = 800;

function errorResponse(status: number, message: string): Response {
  return Response.json({ message }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return errorResponse(401, "Veuillez vous connecter.");
  }

  const parsed = chatRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(400, "Message invalide.");
  }

  if (
    !checkRateLimit(`ai-chat:${session.userId}`, {
      limit: 15,
      windowMs: 60_000,
    })
  ) {
    return errorResponse(429, "Trop de messages. Réessayez dans une minute.");
  }

  const result = streamText({
    model: getChatModel(),
    instructions: buildChatInstructions(session.activeRole),
    messages: parsed.data.messages,
    maxOutputTokens: MAX_ANSWER_TOKENS,
    abortSignal: AbortSignal.any([
      request.signal,
      AbortSignal.timeout(RESPONSE_TIMEOUT_MS),
    ]),
    onError: ({ error }) => {
      console.error(
        "[chat] error:",
        error instanceof Error ? error.name : "UnknownError",
      );
    },
  });

  return result.toTextStreamResponse();
}
