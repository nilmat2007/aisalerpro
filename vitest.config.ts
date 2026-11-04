import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import path from 'node:path';

function loadDotEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, '.env.local');
  const envVars: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        envVars[key] = val;
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
  return envVars;
}

const loadedEnv = loadDotEnvLocal();

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: loadedEnv,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
