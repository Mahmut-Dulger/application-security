// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      security: security
    },
    rules: {
      ...security.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
);
