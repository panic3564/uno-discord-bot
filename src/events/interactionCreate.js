const { Events, Collection } = require('discord.js');

// Minimum interval in milliseconds between commands from the same user,
// to prevent command spamming
const COMMAND_COOLDOWN_MS = 2000;
const lastCommandAt = new Collection();

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    // Per-user cooldown to prevent command spamming
    const now = Date.now();
    const lastUsed = lastCommandAt.get(interaction.user.id) || 0;
    if (now - lastUsed < COMMAND_COOLDOWN_MS) {
      const waitSeconds = ((COMMAND_COOLDOWN_MS - (now - lastUsed)) / 1000).toFixed(1);
      return interaction.reply({
        content: `Please wait ${waitSeconds} seconds before using another command.`,
        ephemeral: true,
      });
    }
    lastCommandAt.set(interaction.user.id, now);

    try {
      await command.execute(interaction, interaction.client);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        });
      }
    }
  },
};
