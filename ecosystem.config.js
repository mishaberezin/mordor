const defaults = {
  env: {
    NODE_ENV: "development",
    NODE_APP_INSTANCE: ""
  },
  env_production: {
    NODE_ENV: "production",
    NODE_APP_INSTANCE: ""
  },
  min_uptime: 10000,
  max_restarts: 3,
  log_date_format: "DD-MM-YYYY HH:mm:ss"
};

module.exports = {
  apps: [
    {
      name: "api",
      script: "apps/api.js",
      ...defaults
    },
    {
      name: "cian_crawler",
      script: "apps/cian-crawler.js",
      max_memory_restart: "1G",
      ...defaults
    },
    {
      name: "cian_checker",
      script: "apps/cian-checker.js",
      max_memory_restart: "1G",
      ...defaults
    },
    {
      name: "digest",
      script: "apps/digest.js",
      ...defaults
    },
    {
      name: "report",
      script: "apps/report.js",
      ...defaults
    }
  ],
  deploy: {
    production: {
      user: "ddml",
      host: "206.189.9.70",
      ref: "origin/master",
      repo: "git@github.com:mishaberezin/mordor.git",
      path: "/home/ddml/mordor",
      "post-setup": "ls -la",
      "post-deploy":
        "npm ci && cp ~/.env .env && pm2 startOrRestart ecosystem.config.js --env production"
    }
  }
};
