// @format
module.exports = {
  apps: [
    {
      name: "http-sms-gateway",
      script: "./src/server.js",
      watch: true,
      env: {
        NODE_ENV: "production"
      },
      time: true
    }
  ]
};
