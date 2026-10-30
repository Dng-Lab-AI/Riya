import "server-only";
import OpenAI from "openai";

// OpenAI (ChatGPT) client shared by the lesson summary and the in-class assistant.
// Configure OPENAI_API_KEY, and optionally OPENAI_MODEL, in .env.local.

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

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
