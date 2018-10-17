const defaults = {
    env: {
        "NODE_ENV": "development"
    },
    env_production: {
        "NODE_ENV": "production"
    },
    min_uptime: 10000,
    max_restarts: 3
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
        // {
        //     name: 'post',
        //     script: 'apps/post.js',
        //     ...defaults
        // },
    ],
    deploy: {
        production: {
            user: 'ddml',
            host: '206.189.9.70',
            ref : 'origin/master',
            repo: 'git+https://bitbucket.org/dedimolya/apt-finder.git',
            path: '/home/ddml/apt-finder',
            'post-deploy': 'npm ci && pm2 reload --env production'
        }
    }
};
