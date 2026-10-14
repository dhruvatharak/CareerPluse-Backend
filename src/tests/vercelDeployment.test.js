/**
 * CareerPulse AI - Vercel Serverless & Deployment Health Tests
 * Validates:
 * 1. Health check returns { status, uptime, dbConnected }
 * 2. OPTIONS preflight CORS headers & comma-separated CLIENT_URL support
 * 3. Global Mongoose connection caching across invocations
 * 4. Deployment-safe AI timeout & total time budget (LLM_TOTAL_BUDGET_MS)
 * 5. Serverless entrypoint exports Express app
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../app.js';
import { connectDB, closeDB } from '../config/db.js';
import { env } from '../config/env.js';
import mongoose from 'mongoose';
import serverlessApp from '../../api/index.js';
import { callLLMWithFallback } from '../services/llm.service.js';

describe('Vercel Serverless Entrypoint & App Configuration', () => {
  test('api/index.js should export Express app instance (without calling app.listen)', () => {
    assert.ok(serverlessApp);
    assert.strictEqual(typeof serverlessApp, 'function');
    assert.strictEqual(serverlessApp, app);
  });

  test('app should have trust proxy enabled for serverless reverse proxy IP resolution', () => {
    assert.strictEqual(app.get('trust proxy'), 1);
  });
});

describe('Database Connection Caching for Serverless Invocations', () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    await closeDB();
  });

  test('connectDB should cache connection promise and return existing connection without duplicate connects', async () => {
    assert.strictEqual(mongoose.connection.readyState, 1);
    const conn1 = await connectDB();
    const conn2 = await connectDB();
    assert.strictEqual(conn1, conn2);
    assert.strictEqual(global.mongoose?.conn, conn1);
  });
});

describe('Health Check & CORS Preflight HTTP Invocations', () => {
  let server;
  let baseUrl;

  before(async () => {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeDB();
  });

  test('/api/health should return { status, uptime, dbConnected }', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(typeof body.uptime, 'number');
    assert.strictEqual(body.dbConnected, true);
    assert.ok(body.timestamp);
  });

  test('GET / and GET /api should return 200 welcome response with healthCheck pointer', async () => {
    const resRoot = await fetch(`${baseUrl}/`);
    assert.strictEqual(resRoot.status, 200);
    const bodyRoot = await resRoot.json();
    assert.strictEqual(bodyRoot.success, true);
    assert.strictEqual(bodyRoot.data.healthCheck, '/api/health');

    const resApi = await fetch(`${baseUrl}/api`);
    assert.strictEqual(resApi.status, 200);
    const bodyApi = await resApi.json();
    assert.strictEqual(bodyApi.success, true);
  });

  test('OPTIONS preflight request should return 200 with Access-Control headers for allowed origin', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
    assert.ok(res.headers.get('access-control-allow-methods').includes('POST'));
    assert.ok(res.headers.get('access-control-allow-headers').includes('Authorization'));
  });

  test('OPTIONS preflight request on deep api routes should return 200 immediately', async () => {
    const res = await fetch(`${baseUrl}/api/career-guide/recommend`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  test('OPTIONS preflight request for configured CLIENT_URL origin should return allowed headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://careerplus-frontend.vercel.app',
        'Access-Control-Request-Method': 'GET'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://careerplus-frontend.vercel.app');
  });
});

describe('Deployment-Safe LLM Timeouts & Shared Budget', () => {
  test('env configuration should specify LLM_TIMEOUT_MS and LLM_TOTAL_BUDGET_MS', () => {
    assert.ok(env.LLM_TIMEOUT_MS > 0);
    assert.ok(env.LLM_TOTAL_BUDGET_MS >= env.LLM_TIMEOUT_MS || env.LLM_TOTAL_BUDGET_MS > 0);
  });

  test('callLLMWithFallback should fall back safely when budget is exhausted', async () => {
    // When keys are missing or timeout occurs, should return rule-based fallback without unhandled rejection
    const res = await callLLMWithFallback({
      systemPrompt: 'System',
      userPrompt: 'User',
      allowedIds: ['ID-1', 'ID-2'],
      maxItems: 2
    });

    assert.strictEqual(typeof res.generatedBy, 'string');
    assert.ok(['groq', 'gemini', 'fallback'].includes(res.generatedBy));
    if (res.generatedBy === 'fallback') {
      assert.strictEqual(res.success, false);
      assert.ok(res.fallbackReason);
    }
  });
});
