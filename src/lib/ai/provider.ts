import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";

import {
  openRouterProviderRouting,
  type ModelAttempt,
  type OpenRouterProviderRouting,
} from "./fallback";

export function createGymOpenRouter(apiKey: string): OpenRouterProvider {
  return createOpenRouter({
    apiKey,
    compatibility: "strict",
    appName: "Gym Easy",
    appUrl: "https://app.gaffer.pt",
  });
}

export function routingForAttempt(
  attempt: Pick<ModelAttempt, "zdr" | "privacyMode" | "pinnedProviders">,
): OpenRouterProviderRouting {
  if (attempt.privacyMode === "paid_zdr") {
    return openRouterProviderRouting({
      mode: "paid_zdr",
      providers: attempt.pinnedProviders,
    });
  }
  return openRouterProviderRouting({ mode: "standard", zdr: attempt.zdr });
}

export function openRouterChatModel(
  provider: OpenRouterProvider,
  modelId: string,
  attempt: Pick<ModelAttempt, "zdr" | "privacyMode" | "pinnedProviders">,
) {
  return provider.chat(modelId, {
    usage: { include: true },
    structuredOutputs: { strict: false },
    provider: routingForAttempt(attempt),
  });
}
