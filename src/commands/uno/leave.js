const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-leave')
    .setDescription('Leave your current UNO game (an AI bot takes over if the game is in progress)')
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // Find any game in this guild the user is in
    const userGame = gameManager
      .getGamesByGuild(guildId)
      .find(g => g.players.some(p => p.id === userId));

    if (!userGame) {
      await interaction.reply({
        content: 'You are not in any active UNO game in this server.',
        ephemeral: true,
      });
      return;
    }

    // Waiting game: simply free the spot
    if (userGame.status === 'waiting') {
      gameManager.removePlayer(userGame.id, userId);
      const remainingHumans = userGame.players.length;

      if (remainingHumans === 0) {
        await gameManager.cancelWaitingGame(
          userGame.id,
          interaction.client,
          'All players left - the game was cancelled.'
        );
        await interaction.reply({
          content: 'You left the game. Since you were the last player, the game was cancelled.',
          ephemeral: true,
        });
        return;
      }

      // Transfer ownership if the creator left
      if (userGame.createdBy === userId) {
        userGame.createdBy = userGame.players[0].id;
      }

      if (userGame.threadId) {
        await gameManager.updateStatusMessage(userGame.id, interaction.client);
      }

      await interaction.reply({
        content: `You left the waiting game. ${remainingHumans} player(s) remain - they can still start it.`,
        ephemeral: true,
      });
      return;
    }

    // Playing game: an AI bot takes over the player's hand
    const bot = gameManager.convertPlayerToBot(userGame.id, userId);

    if (!bot) {
      await interaction.reply({
        content: 'Could not hand your hand over to an AI bot - the game may have just ended.',
        ephemeral: true,
      });
      return;
    }

    // Announce the takeover in the game thread
    if (userGame.threadId) {
      try {
        const channel = await interaction.client.channels.fetch(userGame.channelId).catch(() => null);
        const threadChannel = channel
          ? await channel.threads.fetch(userGame.threadId).catch(() => null)
          : null;
        if (threadChannel) {
          await threadChannel.send(`<@${userId}> left the game - ${bot.avatar} ${bot.name} (AI) takes over their hand!`);
        }
      } catch (error) {
        console.error('Error announcing player takeover:', error);
      }
    }

    const remainingHumans = userGame.players.filter(p => p.type === 'human').length;

    if (remainingHumans === 0) {
      gameManager.endGame(userGame.id);
      await interaction.reply({
        content: `You left the game. No human players remained, so the game was ended. ${bot.avatar} ${bot.name} (AI) takes over your hand.`,
        ephemeral: true,
      });
      return;
    }

    await gameManager.updateStatusMessage(userGame.id, interaction.client);

    await interaction.reply({
      content: `You left the game. ${bot.avatar} ${bot.name} (AI) now plays your hand.`,
      ephemeral: true,
    });
  },
};
