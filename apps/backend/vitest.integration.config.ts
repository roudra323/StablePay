import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/integration/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        // Longer timeouts for blockchain operations
        testTimeout: 30000,
        hookTimeout: 30000,
        // Run integration tests sequentially to avoid race conditions
        fileParallelism: false,
        typecheck: {
            tsconfig: './tsconfig.json',
        },
    },
});

