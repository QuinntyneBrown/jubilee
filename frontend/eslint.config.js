// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Selectors use `jb-*`; class, file and folder names omit the prefix (AGENTS.md).
      // Attribute selectors keep the mock's native element, so the DOM matches the design reference.
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'jb', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: 'jb', style: 'kebab-case' },
      ],
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/directive-class-suffix': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // A card or row component renders the content of its anchor from this input.
      '@angular-eslint/template/elements-content': [
        'error',
        { allowList: ['business', 'product'] },
      ],
    },
  },
]);
