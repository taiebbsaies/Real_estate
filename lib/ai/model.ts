import "server-only";
import type { LanguageModel } from "ai";
import { google } from "@ai-sdk/google";

export function getExpenseModel(): LanguageModel {
  const model = process.env.AI_MODEL ?? "gemini-3.6-flash";
  return google(model);
}
