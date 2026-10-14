/**
 * CareerPulse AI - Safe JSON Parser for AI/LLM Outputs
 * Strips <think> blocks and markdown fences, extracts the first {...} object,
 * enforces schema constraints, clamps scores, and purges hallucinated IDs.
 */

/**
 * Pre-processes text by removing reasoning/thinking traces and markdown fences,
 * then extracts the first JSON object.
 *
 * @param {string} text
 * @returns {string} Cleaned JSON object string
 */
export const cleanAndExtractJson = (text) => {
  if (!text || typeof text !== 'string') return '';

  // 1. Strip <think>...</think> blocks (case-insensitive, multi-line)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Strip markdown fences (e.g. ```json or ```)
  cleaned = cleaned.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // 3. Extract the first {...} object
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    return cleaned.substring(firstOpen, lastClose + 1);
  }

  return cleaned;
};

/**
 * Parses and validates raw LLM output against expected schema and allowed IDs.
 *
 * @param {string} rawString - Raw text response from LLM
 * @param {Array<string>} allowedIds - Valid dataset IDs (e.g. ['GRP-101', 'GRP-102'])
 * @param {number} maxItems - Maximum allowed items to return
 * @returns {Object} Validated { recommendations, summary }
 * @throws {Error} With .fallbackReason = 'INVALID_JSON' or 'NO_VALID_IDS'
 */
export const safeParseLLMResponse = (rawString, allowedIds = [], maxItems = 5) => {
  if (!rawString || typeof rawString !== 'string') {
    const err = new Error('LLM response is empty or not a string');
    err.fallbackReason = 'INVALID_JSON';
    throw err;
  }

  const cleaned = cleanAndExtractJson(rawString);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const parseErr = new Error(`Failed to parse LLM JSON output: ${err.message}`);
    parseErr.fallbackReason = 'INVALID_JSON';
    throw parseErr;
  }

  if (!parsed || typeof parsed !== 'object') {
    const err = new Error('Parsed LLM output is not an object');
    err.fallbackReason = 'INVALID_JSON';
    throw err;
  }

  const rawRecommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const allowedSet = new Set(allowedIds.map((id) => String(id).trim()));

  // Filter, validate, and clamp items
  const validRecommendations = [];

  for (const item of rawRecommendations) {
    if (!item || typeof item !== 'object') continue;

    const id = item.id ? String(item.id).trim() : '';

    // Enforce grounded dataset ID
    if (allowedSet.size > 0 && !allowedSet.has(id)) {
      console.warn(`[jsonSafeParse] Dropping hallucinated or unlisted ID: "${id}"`);
      continue;
    }

    // Category validation
    let category = item.category ? String(item.category).toLowerCase().trim() : 'safe';
    if (!['best', 'stretch', 'safe'].includes(category)) {
      category = 'safe';
    }

    // Match score clamping (0 to 100)
    let score = typeof item.matchScore === 'number' ? item.matchScore : parseInt(item.matchScore, 10);
    if (isNaN(score)) score = 75;
    score = Math.max(0, Math.min(100, Math.round(score)));

    validRecommendations.push({
      id,
      name: item.name ? String(item.name).trim() : id,
      category,
      reason: item.reason ? String(item.reason).trim() : 'Recommended based on your profile.',
      matchScore: score
    });
  }

  if (validRecommendations.length === 0) {
    const err = new Error('No valid recommendations remained after filtering against allowed dataset IDs');
    err.fallbackReason = 'NO_VALID_IDS';
    throw err;
  }

  // Cap at maxItems recommendations
  const finalRecommendations = validRecommendations.slice(0, maxItems);
  const summary = parsed.summary && typeof parsed.summary === 'string'
    ? parsed.summary.trim()
    : 'Career recommendations tailored to your profile.';

  return {
    recommendations: finalRecommendations,
    summary
  };
};

export const safeParseGrokResponse = safeParseLLMResponse;

export default { cleanAndExtractJson, safeParseLLMResponse, safeParseGrokResponse };
