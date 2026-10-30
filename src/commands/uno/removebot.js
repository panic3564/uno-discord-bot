const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-removebot')
    .setDescription('Remove AI bots from an existing UNO game')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of bots to remove (1-3)')
        .setMinValue(1)
        .setMaxValue(3)
        .setRequired(true)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;
    const count = interaction.options.getInteger('count');

    // Find waiting games in this channel
    const existingGames = gameManager.getGamesByGuild(guildId);
    const waitingGame = existingGames.find(g => 
      g.channelId === channelId && 
      g.status === 'waiting' &&
      g.createdBy === userId
    );

    if (!waitingGame) {
      await interaction.reply({
        content: 'No waiting game found in this channel that you created. Use `/uno-start` to create a new game.',
        ephemeral: true,
      });
      return;
    }

    // Check if there are bots to remove
    if (waitingGame.bots.length === 0) {
      await interaction.reply({
        content: 'There are no AI bots in this game to remove.',
        ephemeral: true,
      });
      return;
    }

    // Check if trying to remove more bots than exist
    if (count > waitingGame.bots.length) {
      await interaction.reply({
        content: `This game only has ${waitingGame.bots.length} bot(s). You cannot remove ${count}.`,
        ephemeral: true,
      });
      return;
    }

    // Remove bots
    const removedBots = gameManager.removeBots(waitingGame.id, count);
    
    if (removedBots.length === 0) {
      await interaction.reply({
        content: 'Failed to remove bots from the game.',
        ephemeral: true,
      });
      return;
    }

    const botNames = removedBots.map(bot => `**${bot.avatar} ${bot.name}**`).join(', ');
    const totalBots = waitingGame.bots.length;

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🤖 AI Bots Removed!')
      .setDescription(`Removed **${count}** AI bot(s) from game **${waitingGame.id}**\n\n` +
        `🤖 **Removed Bots:** ${botNames}\n` +
        `👥 **Total Players:** ${waitingGame.players.length} humans + ${totalBots} bots = ${waitingGame.players.length + totalBots} total\n` +
        `📍 **Channel:** <#${channelId}>\n\n` +
        `Use "/uno-begin" to start the game!`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
