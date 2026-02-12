import { apiClient } from "@/api/client";

export type AIRole = "CITIZEN" | "WORKER" | "ADMIN";

type AskAssistantInput = {
  role: AIRole;
  message: string;
  context?: unknown;
  imageDataUrl?: string;
};

type AskAssistantResponse = {
  answer: string;
  source?: string;
  recommendation?: "CONFIRM" | "REWORK";
  suggestedRating?: number;
  confidence?: "CLEAR" | "UNCLEAR";
};

type AnalyzeWorkInput = {
  beforeImageDataUrl: string;
  afterImageDataUrl: string;
  context?: unknown;
};

export type WorkAnalysisResult = {
  answer: string;
  recommendation: "CONFIRM" | "REWORK";
  suggestedRating: number;
  confidence: "CLEAR" | "UNCLEAR";
};

export async function askAssistant(input: AskAssistantInput): Promise<string> {
  const res = await apiClient.post<AskAssistantResponse>("/ai/assistant", {
    role: input.role,
    message: input.message,
    context: input.context ?? {},
    imageDataUrl: input.imageDataUrl,
  });

  const answer = String(res.data?.answer || "").trim();
  if (!answer) throw new Error("AI_EMPTY_RESPONSE");
  return answer;
}

export async function analyzeWorkPhotos(input: AnalyzeWorkInput): Promise<WorkAnalysisResult> {
  const res = await apiClient.post<AskAssistantResponse>("/ai/analyze-work", {
    beforeImageDataUrl: input.beforeImageDataUrl,
    afterImageDataUrl: input.afterImageDataUrl,
    context: input.context ?? {},
  });

  const answer = String(res.data?.answer || "").trim();
  if (!answer) throw new Error("AI_EMPTY_RESPONSE");

  const recommendation = res.data?.recommendation === "CONFIRM" ? "CONFIRM" : "REWORK";
  const confidence = res.data?.confidence === "CLEAR" ? "CLEAR" : "UNCLEAR";
  const rawRating = Number(res.data?.suggestedRating);
  const suggestedRating = Number.isFinite(rawRating) ? Math.min(5, Math.max(1, Math.round(rawRating))) : recommendation === "CONFIRM" ? 4 : 3;

  return { answer, recommendation, suggestedRating, confidence };
}
