module.exports = {
  apps: [
    {
      name: "whatsapp-bot-1",
      script: "./index.js",
      env: {
        INSTANCE_NAME: "bot1"
      }
    },
    {
      name: "whatsapp-bot-2",
      script: "./index.js",
      env: {
        INSTANCE_NAME: "bot2"
      }
    }
  ]
};
