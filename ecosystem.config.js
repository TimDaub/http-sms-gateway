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
      time: true,
      // TODO: It seems the server currently has a memory leak somewhere.
      max_memory_restart: "100M"
    }
  ]
};
