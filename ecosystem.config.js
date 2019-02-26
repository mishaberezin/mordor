const defaults = {
  apps: {
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
  },
  deploy: {
    user: "ddml",
    host: "206.189.9.70",
    ref: "origin/master",
    repo: "git@github.com:mishaberezin/mordor.git",
    path: "/var/www/mordor",
    "post-setup": "ls -la"
  }
};

module.exports = {
  apps: [
    {
      name: "api",
      script: "app/api.js",
      ...defaults.apps
    },
    {
      name: "cian_crawler",
      script: "app/cian-crawler.js",
      max_memory_restart: "300M",
      ...defaults.apps
    },
    {
      name: "cian_checker",
      script: "app/cian-checker.js",
      max_memory_restart: "300M",
      ...defaults.apps
    },
    {
      name: "realty_crawler",
      script: "app/realty-crawler.js",
      max_memory_restart: "300M",
      ...defaults.apps
    },
    {
      name: "realty_checker",
      script: "app/realty-checker.js",
      max_memory_restart: "300M",
      ...defaults.apps
    },
    {
      name: "digest",
      script: "app/digest.js",
      ...defaults.apps
    },
    {
      name: "report",
      script: "app/report.js",
      ...defaults.apps
    }
  ],
  deploy: {
    production: {
      ...defaults.deploy,
      "post-deploy":
        "pm2 stop all && cp ~/.env .env && rm -fr .tmp && npm ci && pm2 reset all && pm2 startOrRestart ecosystem.config.js --env production"
    },
    production_fast: {
      ...defaults.deploy,
      "post-deploy": "pm2 startOrRestart ecosystem.config.js --env production"
    }
  }
};
