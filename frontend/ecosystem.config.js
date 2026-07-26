module.exports = {
  apps: [
    {
      name: 'plazo-frontend',
      // Use next start for both dev and production
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/root/plazo/frontend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      // Log configuration
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Graceful shutdown
      shutdown_with_message: false,
      wait_ready: false,
      // Auto restart on crash with exponential backoff
      exp_backoff_restart_delay: 100,
    },
  ],
};
