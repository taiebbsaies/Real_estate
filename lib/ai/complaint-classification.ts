import { z } from "zod";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_CATEGORY_LABELS,
  COMPLAINT_PRIORITIES,
  COMPLAINT_PRIORITY_LABELS,
} from "@/lib/constants/complaint";
import type {
  ComplaintClassification,
  ComplaintClassificationState,
} from "@/lib/ai/types";

export const AI_API_KEY_ENV = "AI_API_KEY";
export const AI_MODEL_ENV = "AI_MODEL";
export const AI_BASE_URL_ENV = "AI_BASE_URL";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 15_000;

export const AI_NOT_CONFIGURED_MESSAGE =
  "La classification automatique n'est pas configurée sur ce serveur.";

export const AI_PROVIDER_ERROR_MESSAGE =
  "Le service de classification automatique est momentanément indisponible.";

export const AI_TIMEOUT_MESSAGE =
  "Le service de classification automatique met trop de temps à répondre.";

export const AI_INVALID_RESPONSE_MESSAGE =
  "La classification automatique a renvoyé une réponse invalide.";

export type AiProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

/**
 * Read the optional AI provider configuration. The project does not ship an
 * AI SDK, so any OpenAI-compatible chat-completions endpoint can be used
 * without adding a dependency. Nothing is configured by default.
 */
export function getAiProviderConfig(
  env: Record<string, string | undefined> = process.env,
): AiProviderConfig | null {
  const apiKey = env[AI_API_KEY_ENV]?.trim();
  const model = env[AI_MODEL_ENV]?.trim();
  if (!apiKey || !model) return null;

  const baseUrl = (env[AI_BASE_URL_ENV]?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

  return { apiKey, baseUrl, model };
}

const classificationSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORIES),
  priority: z.enum(COMPLAINT_PRIORITIES),
  explanation: z.string().trim().min(1).max(600),
  recommendedAction: z.string().trim().min(1).max(600),
});

/**
 * Accept only the four values we intend to use. Extra keys (including a status
 * or a technician) are ignored, and unknown category/priority values fail.
 */
export function parseComplaintClassification(
  content: string,
): ComplaintClassification | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed: unknown = JSON.parse(cleaned);
    const result = classificationSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

const PRIORITY_GUIDANCE = [
  "low = gêne mineure, peut attendre",
  "medium = gêne réelle sans danger immédiat",
  "high = impact important, à traiter rapidement",
  "urgent = danger immédiat, dégât en cours ou problème de sécurité",
].join(" ; ");

const SYSTEM_PROMPT = [
  "Tu classes des réclamations de logement pour HomeCheck.",
  "Analyse uniquement le titre et la description fournis par le locataire.",
  "Choisis exactement une catégorie et une priorité parmi les valeurs autorisées.",
  `Catégories autorisées : ${COMPLAINT_CATEGORIES.map(
    (category) => `${category} (${COMPLAINT_CATEGORY_LABELS[category]})`,
  ).join(", ")}.`,
  `Priorités autorisées : ${COMPLAINT_PRIORITIES.map(
    (priority) => `${priority} (${COMPLAINT_PRIORITY_LABELS[priority]})`,
  ).join(", ")}.`,
  `Guide des priorités : ${PRIORITY_GUIDANCE}.`,
  "Règles de rédaction :",
  "- explanation : une à deux phrases en français qui justifient la priorité en s'appuyant sur des éléments concrets de la description.",
  "- recommendedAction : une action d'intervention concrète et courte en français.",
  "- N'invente aucun fait absent de la description. Ne prétends pas qu'un problème est dangereux sans indice explicite (odeur de gaz, étincelles, fils dénudés, dégât d'eau actif, etc.).",
  "Réponds uniquement avec un objet JSON valide, sans texte autour, au format :",
  '{"category":"...","priority":"...","explanation":"...","recommendedAction":"..."}',
  "Ne propose jamais de statut, de technicien, d'identité ou d'identifiant.",
].join("\n");

type ChatCompletionContentPart = { type?: string; text?: unknown };

function extractMessageContent(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;

  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const message = (choices[0] as { message?: unknown } | null)?.message;
  if (typeof message !== "object" || message === null) return null;

  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part !== "object" || part === null) return "";
        const candidate = part as ChatCompletionContentPart;
        return typeof candidate.text === "string" ? candidate.text : "";
      })
      .join("");
    return text || null;
  }

  return null;
}

export type ComplaintClassificationRequestOptions = {
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests; defaults to 15 seconds. */
  timeoutMs?: number;
  /** Explicit config for tests; defaults to environment configuration. */
  config?: AiProviderConfig | null;
};

/**
 * Ask an OpenAI-compatible provider to classify one complaint. Only the title,
 * description and the allowed option lists are sent. The response is strictly
 * validated and never persisted by this module.
 */
export async function requestComplaintClassification(
  input: { title: string; description: string },
  options: ComplaintClassificationRequestOptions = {},
): Promise<ComplaintClassificationState> {
  const config =
    options.config === undefined ? getAiProviderConfig() : options.config;

  if (!config) {
    return {
      ok: false,
      code: "not_configured",
      message: AI_NOT_CONFIGURED_MESSAGE,
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Titre : ${input.title.trim()}\nDescription : ${input.description.trim()}`,
          },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        code: "provider_error",
        message: AI_PROVIDER_ERROR_MESSAGE,
      };
    }

    const payload: unknown = await response.json();
    const content = extractMessageContent(payload);
    const classification = content
      ? parseComplaintClassification(content)
      : null;

    if (!classification) {
      return {
        ok: false,
        code: "invalid_response",
        message: AI_INVALID_RESPONSE_MESSAGE,
      };
    }

    return { ok: true, classification };
  } catch {
    if (controller.signal.aborted) {
      return { ok: false, code: "timeout", message: AI_TIMEOUT_MESSAGE };
    }

    return {
      ok: false,
      code: "provider_error",
      message: AI_PROVIDER_ERROR_MESSAGE,
    };
  } finally {
    clearTimeout(timer);
  }
}
