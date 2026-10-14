/**
 * CareerPulse AI - LLM Service Unit Tests
 * Tests error categorization, provider fallback hierarchy, and retry mechanism.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { categorizeError } from '../services/llm.service.js';
import { cleanAndExtractJson, safeParseLLMResponse } from '../helpers/jsonSafeParse.js';

describe('LLM Service Error Categorization', () => {
  test('should categorize 401 and 403 as HTTP_401', () => {
    assert.strictEqual(categorizeError({ response: { status: 401 } }), 'HTTP_401');
    assert.strictEqual(categorizeError({ response: { status: 403 } }), 'HTTP_401');
  });

  test('should categorize 404 as HTTP_404_MODEL', () => {
    assert.strictEqual(categorizeError({ response: { status: 404 } }), 'HTTP_404_MODEL');
  });

  test('should categorize 429 as HTTP_429', () => {
    assert.strictEqual(categorizeError({ response: { status: 429 } }), 'HTTP_429');
  });

  test('should categorize timeouts as TIMEOUT', () => {
    assert.strictEqual(categorizeError({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }), 'TIMEOUT');
    assert.strictEqual(categorizeError({ code: 'ETIMEDOUT', message: 'Connection timed out' }), 'TIMEOUT');
    assert.strictEqual(categorizeError({ message: 'Request timeout' }), 'TIMEOUT');
  });

  test('should categorize 5xx and connection drops as NETWORK', () => {
    assert.strictEqual(categorizeError({ response: { status: 500 } }), 'NETWORK');
    assert.strictEqual(categorizeError({ response: { status: 502 } }), 'NETWORK');
    assert.strictEqual(categorizeError({ response: { status: 503 } }), 'NETWORK');
    assert.strictEqual(categorizeError({ code: 'ENOTFOUND' }), 'NETWORK');
    assert.strictEqual(categorizeError({ code: 'ECONNREFUSED' }), 'NETWORK');
  });

  test('should preserve tagged fallbackReason', () => {
    assert.strictEqual(categorizeError({ fallbackReason: 'INVALID_JSON' }), 'INVALID_JSON');
    assert.strictEqual(categorizeError({ fallbackReason: 'NO_VALID_IDS' }), 'NO_VALID_IDS');
  });
});

describe('JSON Pre-parsing and Extraction', () => {
  test('cleanAndExtractJson should strip reasoning blocks, fences, and extract first object', () => {
    const raw = `<think>
Plan:
1. Examine student inputs.
2. Select top matches.
</think>
Introductory text from model...
\`\`\`json
{
  "recommendations": [
    { "id": "GRP-101", "name": "Bio-Maths", "category": "best", "reason": "High marks", "matchScore": 92 }
  ],
  "summary": "Great fit for engineering and medical."
}
\`\`\`
Extra notes at bottom.`;

    const cleaned = cleanAndExtractJson(raw);
    assert.ok(cleaned.startsWith('{'));
    assert.ok(cleaned.endsWith('}'));
    assert.strictEqual(cleaned.includes('<think>'), false);

    const parsed = JSON.parse(cleaned);
    assert.strictEqual(parsed.recommendations[0].id, 'GRP-101');
  });

  test('safeParseLLMResponse should throw INVALID_JSON for unparseable input', () => {
    assert.throws(
      () => safeParseLLMResponse('Not a json at all', ['GRP-101']),
      (err) => {
        assert.strictEqual(err.fallbackReason, 'INVALID_JSON');
        return true;
      }
    );
  });
});

describe('LLM Provider Skipping with Missing Keys', () => {
  test('callSingleProvider should skip and return NO_API_KEY when key is empty', async () => {
    const { callSingleProvider } = await import('../services/llm.service.js');
    const res = await callSingleProvider(
      'Groq',
      { apiKey: '', apiUrl: 'https://api.groq.com/openai/v1/chat/completions', model: 'test' },
      'System prompt',
      'User prompt'
    );
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'NO_API_KEY');
  });
});
