// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'OFD',
      script: 'server.js',
      instances: 'max', // Auto-detect how many instances to run (based on the CPU cores)
      exec_mode: 'cluster', // Cluster mode for high availability
      env: {
        NODE_ENV: 'development', // Environment: development
      },
      env_production: {
        NODE_ENV: 'production', // Environment: production
      },
      log_file: 'logs/app.log', // Log file location
      out_file: 'logs/out.log', // Output logs
      error_file: 'logs/error.log', // Error logs
      combine_logs: true,
      max_memory_restart: '500M', // Restart if memory usage exceeds 500MB
      log_date_format: 'YYYY-MM-DD HH:mm Z', // Timestamp format for logs
    },
  ],
};
