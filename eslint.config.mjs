import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "coverage/**", "dist/**", "node_modules/**"]
  },
  ...nextCoreWebVitals
];

export default eslintConfig;
