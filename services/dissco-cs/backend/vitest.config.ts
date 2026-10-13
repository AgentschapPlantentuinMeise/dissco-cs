import { defineConfig } from 'vitest/config';

// Tests live outside src/ (so tsc never builds them) and only cover pure logic, so no env vars or
// database are needed here.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
