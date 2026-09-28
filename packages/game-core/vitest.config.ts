import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // tsc also emits the tests to dist/; run only the sources so stale builds never run
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.test.ts'],
        },
    },
});
