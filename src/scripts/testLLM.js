/**
 * CareerPulse AI - LLM Provider Test Script
 * Tests each configured provider (Groq and Gemini) separately.
 * Prints the URL, model, HTTP status, and success/failure for each.
 * Never logs API keys.
 * Run via: npm run test:llm
 */

import axios from 'axios';
import { env } from '../config/env.js';

const testProvider = async ({ name, apiUrl, model, apiKey }) => {
  console.log(`\n====================================================`);
  console.log(`🔍 Testing ${name} Provider`);
  console.log(`Endpoint:    ${apiUrl}`);
  console.log(`Model:       ${model}`);

  const isConfigured = Boolean(apiKey && apiKey.trim());
  console.log(`Configured:  ${isConfigured ? 'yes' : 'no'}`);

  if (!isConfigured) {
    console.log(`HTTP Status: N/A`);
    console.log(`Result:      SKIPPED (Provider not configured - missing API key)`);
    return { name, configured: false, status: 'N/A', success: false };
  }

  const basePayload = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You are a test responder. Return strict JSON only in this schema: { "status": "ok", "provider": "string" }'
      },
      { role: 'user', content: 'Ping test.' }
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

  const timeout = env.LLM_TIMEOUT_MS || 30000;
  let httpStatus = 'N/A';

  try {
    let response;
    try {
      response = await axios.post(apiUrl, payloadWithFormat, { headers, timeout });
      httpStatus = response.status;
    } catch (err) {
      if (err.response && err.response.status === 400) {
        // Retry once without response_format as per specification
        response = await axios.post(apiUrl, basePayload, { headers, timeout });
        httpStatus = response.status;
      } else {
        throw err;
      }
    }

    console.log(`HTTP Status: ${httpStatus}`);
    console.log(`Result:      SUCCESS`);
    const content = response.data?.choices?.[0]?.message?.content;
    if (content) {
      console.log(`Sample output: ${content.trim().slice(0, 120)}`);
    }
    return { name, configured: true, status: httpStatus, success: true };
  } catch (err) {
    httpStatus = err.response ? err.response.status : err.code || 'Network Error';
    const detail = err.response?.data?.error?.message || err.message;
    console.log(`HTTP Status: ${httpStatus}`);
    console.log(`Result:      FAILURE (${detail})`);
    return { name, configured: true, status: httpStatus, success: false };
  }
};

const runAllTests = async () => {
  console.log('🚀 CareerPulse AI - LLM Provider Verification');
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Timeout:     ${env.LLM_TIMEOUT_MS}ms`);

  const results = [];

  // Provider 1: Groq
  results.push(
    await testProvider({
      name: 'Groq',
      apiUrl: env.GROQ_API_URL,
      model: env.GROQ_MODEL,
      apiKey: env.GROQ_API_KEY
    })
  );

  // Provider 2: Gemini
  results.push(
    await testProvider({
      name: 'Gemini',
      apiUrl: env.GEMINI_API_URL,
      model: env.GEMINI_MODEL,
      apiKey: env.GEMINI_API_KEY
    })
  );

  console.log(`\n====================================================`);
  console.log('📊 Summary:');
  results.forEach((r) => {
    const outcome = !r.configured
      ? 'SKIPPED (No Key)'
      : r.success
      ? `SUCCESS (HTTP ${r.status})`
      : `FAILED (HTTP ${r.status})`;
    console.log(`  - ${r.name.padEnd(8)}: ${outcome}`);
  });
  console.log('====================================================\n');
};

runAllTests().catch((err) => {
  console.error('Fatal error running LLM tests:', err.message);
  process.exit(1);
});
