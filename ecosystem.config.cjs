// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'api-main',
      cwd: '/var/www/vhosts/iservreport.com/api.iservreport.com',
      script: 'index.js',
      interpreter: '/opt/plesk/node/22/bin/node',
      exec_mode: 'cluster', 
      instances: '4', 
      env_file: '.env.main', 
      env: {
        NODE_ENV: 'production',
        NODE_PORT: 4000 // 🌟 บังคับพอร์ต 4000 ตรงนี้เลย (สิทธิ์ใหญ่สุด)
      },
      out_file: '/var/www/vhosts/iservreport.com/api.iservreport.com/logs/main.out.log',
      error_file: '/var/www/vhosts/iservreport.com/api.iservreport.com/logs/main.error.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '2G',
      kill_timeout: 10000,
      listen_timeout: 10000,
      autorestart: true,
      watch: false
    },
    {
      name: 'api-mj',
      cwd: '/var/www/vhosts/iservreport.com/api.iservreport.com',
      script: 'index.js',
      interpreter: '/opt/plesk/node/22/bin/node',
      exec_mode: 'cluster', 
      instances: '4', 
      env_file: '.env.mj',
      env: {
        NODE_ENV: 'production',
        NODE_PORT: 4001 // 🌟 บังคับพอร์ต 4001 ตรงนี้เลย (สิทธิ์ใหญ่สุด)
      },
      out_file: '/var/www/vhosts/iservreport.com/api.iservreport.com/logs/mj.out.log',
      error_file: '/var/www/vhosts/iservreport.com/api.iservreport.com/logs/mj.error.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '2G',
      kill_timeout: 10000,
      listen_timeout: 10000,
      autorestart: true,
      watch: false
    }
  ]
}