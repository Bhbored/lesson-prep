import type { ProviderId } from "@/app/shared/schemas/domain";
import type en from "@/app/shared/i18n/en.json";

export type GuideStepId = "account" | "billing" | "key";
type MessageKey = keyof typeof en;

export interface GuideStepMeta {
  readonly id: GuideStepId;
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
  /** Real console screenshots under /public/guide — omit until captured. */
  readonly images: Partial<Record<GuideStepId, string>>;
}

export const guideStepOrder: readonly GuideStepMeta[] = [
  {
    id: "account",
    titleKey: "guideStepAccount",
    urlField: "signupUrl",
  },
  {
    id: "billing",
    titleKey: "guideStepBilling",
    urlField: "billingUrl",
  },
  {
    id: "key",
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
    images: {
      account: "/guide/openai-account.png",
      billing: "/guide/openai-billing.png",
      key: "/guide/openai-key.png",
    },
  },
  gemini: {
    signupUrl: "https://aistudio.google.com/",
    billingUrl: "https://aistudio.google.com/api-keys",
    keysUrl: "https://aistudio.google.com/api-keys",
    accountBodyKey: "guideGeminiAccount",
    billingBodyKey: "guideGeminiBilling",
    keyBodyKey: "guideGeminiKey",
    images: {
      account: "/guide/gemini-account.png",
      billing: "/guide/gemini-billing.png",
      key: "/guide/gemini-key.png",
    },
  },
  anthropic: {
    signupUrl: "https://console.anthropic.com/",
    billingUrl: "https://console.anthropic.com/settings/billing",
    keysUrl: "https://console.anthropic.com/settings/keys",
    accountBodyKey: "guideAnthropicAccount",
    billingBodyKey: "guideAnthropicBilling",
    keyBodyKey: "guideAnthropicKey",
    images: {
      account: "/guide/anthropic-account.png",
      billing: "/guide/anthropic-billing.png",
      key: "/guide/anthropic-key.png",
    },
  },
  deepSeek: {
    signupUrl: "https://platform.deepseek.com/sign_up",
    billingUrl: "https://platform.deepseek.com/top_up",
    keysUrl: "https://platform.deepseek.com/api_keys",
    accountBodyKey: "guideDeepSeekAccount",
    billingBodyKey: "guideDeepSeekBilling",
    keyBodyKey: "guideDeepSeekKey",
    images: {
      account: "/guide/deepseek-account.png",
      billing: "/guide/deepseek-billing.png",
      key: "/guide/deepseek-key.png",
    },
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
