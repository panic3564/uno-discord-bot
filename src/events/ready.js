const { Events, ActivityType } = require('discord.js');
const { botName, botStatus } = require('../../config/config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    console.log(`Bot ID: ${client.user.id}`);
    console.log(`Servers: ${client.guilds.cache.size}`);

    // Set bot presence
    client.user.setPresence({
      activities: [{ name: botStatus, type: ActivityType.Playing }],
      status: 'online',
    });
  },
};
