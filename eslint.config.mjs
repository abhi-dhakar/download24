import nextConfig from 'eslint-config-next/core-web-vitals'

/**
 * Flat ESLint config (ESLint 10 + eslint-config-next 16).
 * `npm run lint` is intentionally independent of `next build`, which no longer
 * lints on its own in Next 16.
 */
/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'out/**', 'coverage/**', 'public/sw.js']
  },
  ...nextConfig,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      'react/no-danger': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ]
    }
  },
  {
    files: ['lib/**/*.ts', 'scripts/**/*.mjs', '*.config.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off'
    }
  }
]
