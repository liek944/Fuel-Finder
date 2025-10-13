module.exports = {
  apps: [{
    name: 'fuel-finder',
    script: './server.js',
    instances: 1, // IMPORTANT: Only run 1 instance to prevent duplicate uploads
    exec_mode: 'fork', // Use fork mode instead of cluster mode
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
