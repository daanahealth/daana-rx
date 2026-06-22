// Next 16 ships a native ESLint flat config (eslint-config-next exports a
// Linter.Config[] array). The default export bundles core-web-vitals + the
// TypeScript rules — the recommended Next baseline.
import next from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'out/**',
      'coverage/**',
      'vendor/**',
      'e2e/**',
      'next-env.d.ts',
    ],
  },
  ...next,
  {
    // Newly-introduced strict React Hooks rules (Next 16) with pre-existing
    // violations in this codebase. Kept as warnings so the lint gate stays green
    // during adoption — surfaced for incremental cleanup, then promote back to
    // "error". The autofix Action handles auto-fixable issues automatically.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default eslintConfig;
