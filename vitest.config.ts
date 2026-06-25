import { defineConfig } from 'vitest/config';
import path from 'node:path';

// `server-only` throws outside RSC; alias it to a no-op so server modules import
// cleanly under Node. Env vars satisfy the fail-fast loader in src/lib/env.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      APP_BASE_URL: 'https://app.example.com',
      BASECAMP_CLIENT_ID: 'test-client-id',
      BASECAMP_CLIENT_SECRET: 'test-client-secret',
      BASECAMP_REDIRECT_URI: 'https://app.example.com/api/auth/callback',
      BASECAMP_USER_AGENT: 'Test App (dev@example.com)',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJtest-service-role',
      ANTHROPIC_API_KEY: 'sk-ant-test',
      SESSION_SECRET: 'a'.repeat(32),
      TOKEN_ENCRYPTION_KEY: 'b'.repeat(32),
    },
  },
  resolve: {
    alias: {
      'server-only': path.resolve(process.cwd(), 'test/empty-module.ts'),
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
});
