import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** Imports that reach into another package's files instead of using its public entry point. */
const deepImports = {
  group: ['@fte/*/src/*', '**/packages/*/src/*', '../../packages/*/src/*'],
  message: "Import a package through its entry point (e.g. '@fte/ui'), not its internal files.",
}

export default tseslint.config(
  { ignores: ['**/dist', '**/coverage', '**/playwright-report', '**/test-results', '**/.turbo'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['useApi'] }],
      // With `noUncheckedIndexedAccess`, lookups in the normalized tree are typed as possibly
      // undefined. `!` marks the places where the tree's invariants guarantee a value.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'no-restricted-imports': ['error', { patterns: [deepImports] }],
    },
  },
  {
    // Package boundaries: the design system knows nothing about features or apps,
    // and features know nothing about apps.
    files: ['packages/ui/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            deepImports,
            {
              group: ['@fte/file-tree*', '@fte/web*'],
              message: 'The design system must not depend on features or apps.',
            },
          ],
        },
      ],
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['packages/file-tree/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [deepImports, { group: ['@fte/web*'], message: 'A feature package must not depend on an app.' }] },
      ],
    },
  },
  {
    // Test helpers export functions next to components on purpose.
    files: ['**/src/test/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
