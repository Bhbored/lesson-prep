import type { ProviderId } from "@/app/shared/schemas/domain";
import type en from "@/app/shared/i18n/en.json";

export type GuideStepId = "account" | "billing" | "key";
type MessageKey = keyof typeof en;

export interface GuideStepMeta {
  readonly id: GuideStepId;
  readonly image: string;
  readonly titleKey: Extract<
    MessageKey,
    "guideStepAccount" | "guideStepBilling" | "guideStepKey"
  >;
  readonly urlField: "signupUrl" | "billingUrl" | "keysUrl";
}

export interface ProviderGuideLinks {
  readonly signupUrl: string;
  readonly billingUrl: string;
  readonly keysUrl: string;
  readonly accountBodyKey: MessageKey;
  readonly billingBodyKey: MessageKey;
  readonly keyBodyKey: MessageKey;
}

export const guideStepOrder: readonly GuideStepMeta[] = [
  {
    id: "account",
    image: "/guide/step-account.png",
    titleKey: "guideStepAccount",
    urlField: "signupUrl",
  },
  {
    id: "billing",
    image: "/guide/step-billing.png",
    titleKey: "guideStepBilling",
    urlField: "billingUrl",
  },
  {
    id: "key",
    image: "/guide/step-key.png",
    titleKey: "guideStepKey",
    urlField: "keysUrl",
  },
];

/** Official console URLs — signup → billing → create key. */
export const providerGuideLinks: Record<ProviderId, ProviderGuideLinks> = {
  openAi: {
    signupUrl: "https://platform.openai.com/signup",
    billingUrl:
      "https://platform.openai.com/settings/organization/billing/overview",
    keysUrl: "https://platform.openai.com/api-keys",
    accountBodyKey: "guideOpenAiAccount",
    billingBodyKey: "guideOpenAiBilling",
    keyBodyKey: "guideOpenAiKey",
  },
  gemini: {
    signupUrl: "https://aistudio.google.com/",
    billingUrl: "https://aistudio.google.com/api-keys",
    keysUrl: "https://aistudio.google.com/api-keys",
    accountBodyKey: "guideGeminiAccount",
    billingBodyKey: "guideGeminiBilling",
    keyBodyKey: "guideGeminiKey",
  },
  anthropic: {
    signupUrl: "https://console.anthropic.com/",
    billingUrl: "https://console.anthropic.com/settings/billing",
    keysUrl: "https://console.anthropic.com/settings/keys",
    accountBodyKey: "guideAnthropicAccount",
    billingBodyKey: "guideAnthropicBilling",
    keyBodyKey: "guideAnthropicKey",
  },
  deepSeek: {
    signupUrl: "https://platform.deepseek.com/sign_up",
    billingUrl: "https://platform.deepseek.com/top_up",
    keysUrl: "https://platform.deepseek.com/api_keys",
    accountBodyKey: "guideDeepSeekAccount",
    billingBodyKey: "guideDeepSeekBilling",
    keyBodyKey: "guideDeepSeekKey",
  },
};

export function bodyKeyForStep(
  links: ProviderGuideLinks,
  stepId: GuideStepId,
): MessageKey {
  if (stepId === "account") return links.accountBodyKey;
  if (stepId === "billing") return links.billingBodyKey;
  return links.keyBodyKey;
}
