const { Events, ActivityType, REST, Routes } = require('discord.js');
const { clientId, guildId, botStatus } = require('../../config/config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    console.log(`Bot ID: ${client.user.id}`);
    console.log(`Servers: ${client.guilds.cache.size}`);

    // Set bot presence
    client.user.setPresence({
      activities: [{ name: botStatus, type: ActivityType.Playing }],
      status: 'online',
    });

    // Register slash commands
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      }
    }

    const rest = new REST({ version: '10' }).setToken(client.token);

    try {
      console.log('Started refreshing application (/) commands.');

      // Always register commands globally
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log(`Successfully reloaded ${commands.length} application (/) commands globally.`);

      // If guild ID is provided, also register for that guild (instant)
      if (guildId) {
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands },
        );
        console.log(`Successfully reloaded ${commands.length} application (/) commands for guild ${guildId}.`);
      }
    } catch (error) {
      console.error('Error registering commands:', error);
    }
  },
};
