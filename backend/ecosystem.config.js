module.exports = {
  apps: [
    {
      name: 'plazo-backend',
      script: 'dist/main.js',
      // Production: use cluster mode for multi-core utilization
      // Set to number of CPU cores or "max" for all cores
      instances: process.env.PM2_INSTANCES || 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
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
      shutdown_with_message: true,
      wait_ready: true,
      // Auto restart on crash with exponential backoff
      exp_backoff_restart_delay: 100,
      // Monitoring
      instance_var: 'INSTANCE_ID',
      // Environment file for production
      env_file: '.env',
    },
  ],
};
