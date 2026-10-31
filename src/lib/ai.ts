import "server-only";
import OpenAI from "openai";

// OpenAI (ChatGPT) client shared by the lesson summary and the in-class assistant.
// Configure OPENAI_API_KEY, and optionally OPENAI_MODEL, in .env.local.

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

// Only reasoning models (gpt-5 family, o1/o3/o4…) accept `reasoning.effort`; older
// ones such as gpt-4o-mini reject it and cap the output at 16k tokens.
const IS_REASONING_MODEL = /^(gpt-5(?!.*-chat)|o\d)/.test(AI_MODEL);

export function modelOptions(effort: "low" | "medium" | "high", maxOutputTokens: number) {
  return IS_REASONING_MODEL
    ? { model: AI_MODEL, reasoning: { effort }, max_output_tokens: maxOutputTokens }
    : { model: AI_MODEL, max_output_tokens: Math.min(maxOutputTokens, 16_000) };
}

export function isAiAvailable() {
  return !!process.env.OPENAI_API_KEY;
}

let client: OpenAI | null = null;
export function openai() {
  client ??= new OpenAI();
  return client;
}

// Structured output: the model must return JSON matching `schema`.
export function jsonFormat(name: string, schema: Record<string, unknown>) {
  return { format: { type: "json_schema" as const, name, schema, strict: true } };
}
