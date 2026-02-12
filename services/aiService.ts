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
