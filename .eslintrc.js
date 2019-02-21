module.exports = {
  root: true,
  extends: ["eslint:recommended", "prettier"],
  env: {
    node: true,
    es6: true
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    "no-console": "off",
    "no-unused-vars": [
      "error",
      {
        args: "none"
      }
    ]
  },
  overrides: [
    {
      files: ["lib/bots/**/*.js"],
      env: {
        browser: true
      }
    }
  ]
};
