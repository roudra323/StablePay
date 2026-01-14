import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            exclude: [
                'node_modules',
                'dist',
                'test',
                '**/*.test.ts',
                '**/*.d.ts',
            ],
        },
        typecheck: {
            tsconfig: './tsconfig.json',
        },
    },
});

