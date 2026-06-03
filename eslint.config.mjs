import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Allow underscore-prefixed args to remain unused (convention for stub/unused params).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // <img> is the right choice here: tool previews render blob/data URLs from
      // user files that next/image can't optimize (sizes unknown, blob:// not allowed).
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored third-party assets copied by postinstall scripts — not authored here.
    "public/ffmpeg/**",
    "public/pdfjs/**",
    "public/qr-scanner/**",
    "public/ocr/**",
  ]),
]);

export default eslintConfig;
