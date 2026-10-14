/**
 * CareerPulse AI - LLM Service
 * Provides multi-provider OpenAI-compatible AI synthesis with automatic fallback.
 * Provider Order: Groq -> Gemini -> Rule-based Fallback.
 * Adheres strictly to Zero-Hallucination guidelines, safe parsing, and non-leaking logs.
 */

import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { safeParseLLMResponse } from '../helpers/jsonSafeParse.js';

/**
 * Categorizes an error or response into the standardized fallbackReason enum:
 * 'NO_API_KEY' | 'HTTP_401' | 'HTTP_404_MODEL' | 'HTTP_429' | 'TIMEOUT' | 'NETWORK' | 'INVALID_JSON' | 'NO_VALID_IDS'
 *
 * @param {Error|Object} err
 * @returns {string} Standardized reason code
 */
export const categorizeError = (err) => {
  if (!err) return 'NETWORK';

  // If already tagged (e.g. from safeParseLLMResponse)
  if (err.fallbackReason) return err.fallbackReason;

  if (err.response) {
    const status = err.response.status;
    if (status === 401 || status === 403) return 'HTTP_401';
    if (status === 404) return 'HTTP_404_MODEL';
    if (status === 429) return 'HTTP_429';
    if (status >= 500 && status < 600) return 'NETWORK';
    return `HTTP_${status}`;
  }

  if (
    err.code === 'ECONNABORTED' ||
    err.code === 'ETIMEDOUT' ||
    /timeout/i.test(err.message || '')
  ) {
    return 'TIMEOUT';
  }

  return 'NETWORK';
};

/**
 * Invokes a single OpenAI-compatible provider with structured JSON request and retry.
 *
 * @param {string} providerName - 'Groq' | 'Gemini'
 * @param {Object} config - { apiKey, apiUrl, model }
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<{ success: boolean, content?: string, reason?: string }>}
 */
export const callSingleProvider = async (
  providerName,
  config,
  systemPrompt,
  userPrompt,
  customTimeout = null
) => {
  const { apiKey, apiUrl, model } = config;

  if (!apiKey || !apiKey.trim()) {
    logger.info(`[LLM Service] ${providerName} skipped: NO_API_KEY`);
    return { success: false, reason: 'NO_API_KEY' };
  }

  const basePayload = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  const payloadWithFormat = {
    ...basePayload,
    response_format: { type: 'json_object' }
  };

  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json'
  };

  const timeout = customTimeout || env.LLM_TIMEOUT_MS || 8000;

  try {
    let response;
    try {
      response = await axios.post(apiUrl, payloadWithFormat, { headers, timeout });
    } catch (err) {
      // If provider returns 400 because of response_format, retry once without it
      if (err.response && err.response.status === 400) {
        logger.warn(
          `[LLM Service] ${providerName} returned 400 with response_format. Retrying once without response_format...`
        );
        response = await axios.post(apiUrl, basePayload, { headers, timeout });
      } else {
        throw err;
      }
    }

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string' || !content.trim()) {
      logger.warn(`[LLM Service] ${providerName} returned empty completion: INVALID_JSON`);
      return { success: false, reason: 'INVALID_JSON' };
    }

    return { success: true, content };
  } catch (err) {
    const reason = categorizeError(err);
    // Never log the key or auth headers
    logger.warn(`[LLM Service] ${providerName} failed: ${reason}`);
    return { success: false, reason };
  }
};

/**
 * Calls LLM providers in fallback order (Groq first, then Gemini only if time remains).
 * Shared total time budget (LLM_TOTAL_BUDGET_MS) prevents platform serverless execution timeouts.
 * Strips <think> tags and markdown fences, extracts first JSON object,
 * and validates candidate IDs before falling back to deterministic rule-based output.
 *
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {Array<string>} [params.allowedIds=[]]
 * @param {number} [params.maxItems=5]
 * @returns {Promise<{ success: boolean, generatedBy: 'groq'|'gemini'|'fallback', data: Object|null, fallbackReason: string|null }>}
 */
export const callLLMWithFallback = async ({
  systemPrompt,
  userPrompt,
  allowedIds = [],
  maxItems = 5
}) => {
  const startTime = Date.now();
  const totalBudget = env.LLM_TOTAL_BUDGET_MS || 9000;
  const singleTimeout = env.LLM_TIMEOUT_MS || 8000;
  const minTimeForCall = 1500; // Minimum milliseconds required to attempt an HTTP provider call

  const providers = [
    {
      id: 'groq',
      displayName: 'Groq',
      config: {
        apiKey: env.GROQ_API_KEY,
        apiUrl: env.GROQ_API_URL,
        model: env.GROQ_MODEL
      }
    },
    {
      id: 'gemini',
      displayName: 'Gemini',
      config: {
        apiKey: env.GEMINI_API_KEY,
        apiUrl: env.GEMINI_API_URL,
        model: env.GEMINI_MODEL
      }
    }
  ];

  const reasons = {};

  for (const provider of providers) {
    const elapsed = Date.now() - startTime;
    const remainingBudget = totalBudget - elapsed;

    // Only attempt provider if enough budget remains to complete HTTP request & parse
    if (remainingBudget < minTimeForCall) {
      logger.warn(
        `[LLM Service] Skipping ${provider.displayName}: insufficient time budget remaining (${remainingBudget}ms left of ${totalBudget}ms)`
      );
      reasons[provider.id] = 'TIMEOUT';
      continue;
    }

    // Single provider timeout cannot exceed the remaining budget
    const providerTimeout = Math.min(singleTimeout, remainingBudget);

    const callRes = await callSingleProvider(
      provider.displayName,
      provider.config,
      systemPrompt,
      userPrompt,
      providerTimeout
    );

    if (!callRes.success) {
      reasons[provider.id] = callRes.reason;
      continue;
    }

    // Attempt to parse and validate returned content
    try {
      const parsed = safeParseLLMResponse(callRes.content, allowedIds, maxItems);
      // Success!
      // If Groq had failed and Gemini answered, retain Groq's failure reason for dev tooltip
      const fallbackReason = reasons.groq ? `Groq: ${reasons.groq}` : null;
      return {
        success: true,
        generatedBy: provider.id,
        data: parsed,
        fallbackReason
      };
    } catch (parseErr) {
      const parseReason = parseErr.fallbackReason || 'INVALID_JSON';
      reasons[provider.id] = parseReason;
      logger.warn(`[LLM Service] ${provider.displayName} output validation failed: ${parseReason}`);
      // Fall through to next provider if time remains
    }
  }

  // Both providers failed, were skipped, or budget exhausted -> rule-based fallback
  const combined = [];
  if (reasons.groq) combined.push(`Groq: ${reasons.groq}`);
  if (reasons.gemini) combined.push(`Gemini: ${reasons.gemini}`);
  const finalFallbackReason = combined.join(', ') || 'AI_UNAVAILABLE';

  logger.info(`[LLM Service] Switching to rule-based fallback (${finalFallbackReason})`);

  return {
    success: false,
    generatedBy: 'fallback',
    data: null,
    fallbackReason: finalFallbackReason
  };
};

// Aliases for unified consumption
export const callLLM = callLLMWithFallback;
export const callGrok = async ({ systemPrompt, userPrompt, allowedIds = [], maxItems = 5 }) => {
  const res = await callLLMWithFallback({ systemPrompt, userPrompt, allowedIds, maxItems });
  if (res.success && res.data) {
    return JSON.stringify(res.data);
  }
  throw new Error(`LLM synthesis failed: ${res.fallbackReason}`);
};

export default {
  categorizeError,
  callSingleProvider,
  callLLMWithFallback,
  callLLM,
  callGrok
};
