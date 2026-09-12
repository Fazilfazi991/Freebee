import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/build', '**/dist', '**/node_modules', '**/.wrangler', '**/.history'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['app/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        Blob: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        CustomEvent: 'readonly',
        document: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLInputElement: 'readonly',
        Image: 'readonly',
        ImageData: 'readonly',
        navigator: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        URL: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-constant-binary-expression': 'off',
      'no-eval': 'error',
      'prefer-const': 'error',
    },
  },
];
