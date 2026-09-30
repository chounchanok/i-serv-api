// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'api-test',
    cwd: '/var/www/vhosts/iservreport.com/api-test',
    script: 'index.js',
    interpreter: '/opt/plesk/node/22/bin/node',
    exec_mode: 'cluster', 
    instances: '4',

    env: {
      NODE_ENV: 'production',
      NODE_PORT: '4000', 
    },

    // Logs
    out_file: '/var/www/vhosts/iservreport.com/api-test/logs/nodejs.out.log',
    error_file: '/var/www/vhosts/iservreport.com/api-test/logs/nodejs.error.log',
    merge_logs: true,
    time: true,

    // ความเสถียร
    max_memory_restart: '2G',
    kill_timeout: 10000,
    listen_timeout: 10000,
    autorestart: true,
    watch: false,
    node_args: ['--enable-source-maps'] 
  }]
}

