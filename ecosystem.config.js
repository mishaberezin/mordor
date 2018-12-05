const defaults = {
    env: {
        NODE_ENV: 'development',
        NODE_APP_INSTANCE: ''
    },
    env_production: {
        NODE_ENV: 'production',
        NODE_APP_INSTANCE: ''
    },
    min_uptime: 10000,
    max_restarts: 3,
    log_date_format: 'DD-MM-YYYY HH:mm'
};

module.exports = {
    apps: [
        {
            name: 'api',
            script: 'apps/api.js',
            ...defaults
        },
        {
            name: 'cian',
            script: 'apps/cian.js',
            max_memory_restart: '1G',
            ...defaults
        },
        {
            name: 'digest',
            script: 'apps/digest.js',
            ...defaults
        },
        {
            name: 'report',
            script: 'apps/report.js',
            ...defaults
        }
    ],
    deploy: {
        production: {
            user: 'ddml',
            host: '206.189.9.70',
            ref: 'origin/master',
            repo: 'git@bitbucket.org:dedimolya/apt-finder.git',
            path: '/home/ddml/apt-finder',
            'post-setup': 'ls -la',
            'post-deploy': 'npm ci && pm2 startOrReload ecosystem.config.js --env production'
        }
    }
};
