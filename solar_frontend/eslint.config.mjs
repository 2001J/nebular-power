import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore backup files
  {
    ignores: ["**/*.bak", "**/*.bak.*", "**/*.backup", "**/*.old"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Remove unused imports automatically
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      // Disable unused vars check (too noisy, use IDE for this)
      "unused-imports/no-unused-vars": "off",
      // Allow 'any' types (too many in codebase to fix now)
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unsafe function types
      "@typescript-eslint/no-unsafe-function-type": "off",
      // Allow @ts-ignore comments
      "@typescript-eslint/ban-ts-comment": "off",
      // Allow unused expressions in tests
      "@typescript-eslint/no-unused-expressions": "off",
      // Allow quotes and apostrophes in JSX text
      "react/no-unescaped-entities": "off",
      // Allow require() imports
      "@typescript-eslint/no-require-imports": "off",
      // Allow empty interfaces extending other interfaces
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
];

export default eslintConfig;

