import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";

import { openRouterProviderRouting } from "./fallback";
import type { DataPolicy } from "./schemas";

export function createGymOpenRouter(apiKey: string): OpenRouterProvider {
  return createOpenRouter({
    apiKey,
    compatibility: "strict",
    appName: "Gym Easy",
    appUrl: "https://gym-easy.vercel.app",
  });
}

export function openRouterChatModel(
  provider: OpenRouterProvider,
  modelId: string,
  policy: DataPolicy,
) {
  return provider.chat(modelId, {
    usage: { include: true },
    structuredOutputs: { strict: false },
    provider: openRouterProviderRouting(policy),
  });
}
