import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
} as any);
