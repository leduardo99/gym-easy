import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";

import { openRouterProviderRouting } from "./fallback";

export function createGymOpenRouter(apiKey: string): OpenRouterProvider {
  return createOpenRouter({
    apiKey,
    compatibility: "strict",
    appName: "Gym Easy",
    appUrl: "https://app.gaffer.pt",
  });
}

export function openRouterChatModel(
  provider: OpenRouterProvider,
  modelId: string,
  zdr: boolean,
) {
  return provider.chat(modelId, {
    usage: { include: true },
    structuredOutputs: { strict: false },
    provider: openRouterProviderRouting({ zdr }),
  });
}
