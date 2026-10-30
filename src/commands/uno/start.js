const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-start')
    .setDescription('Start a new UNO game')
    .addIntegerOption(option =>
      option.setName('players')
        .setDescription('Number of human players (1-4)')
        .setMinValue(1)
        .setMaxValue(4)
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('bots')
        .setDescription('Number of AI bots to add (0-3)')
        .setMinValue(0)
        .setMaxValue(3)
        .setRequired(false)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const humanPlayers = interaction.options.getInteger('players');
    const botCount = interaction.options.getInteger('bots') || 0;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    // Check if there's already an active game in this channel
    const existingGames = gameManager.getGamesByGuild(guildId);
    const activeGameInChannel = existingGames.find(g => g.channelId === channelId && g.status === 'waiting');
    
    if (activeGameInChannel) {
      await interaction.reply({
        content: `There's already a game waiting in this channel! Use "/uno-join" to join it.`,
        ephemeral: true,
      });
      return;
    }

    // Validate total players
    const totalPlayers = humanPlayers + botCount;
    if (totalPlayers > 4) {
      await interaction.reply({
        content: `Maximum of 4 players allowed (humans + bots). You requested ${humanPlayers} humans + ${botCount} bots = ${totalPlayers} total.`,
        ephemeral: true,
      });
      return;
    }

    if (totalPlayers < 2) {
      await interaction.reply({
        content: `Need at least 2 total players. You requested ${humanPlayers} humans + ${botCount} bots = ${totalPlayers} total.`,
        ephemeral: true,
      });
      return;
    }

    // Create the game
    const game = gameManager.createGame(guildId, {
      players: humanPlayers,
      withBots: botCount > 0,
      botCount,
      maxPlayers: 4,
      createdBy: userId,
      channelId,
    });

    // Add the creator as the first player
    gameManager.addPlayer(game.id, userId);

    // Add AI bots if requested
    if (botCount > 0) {
      gameManager.addBots(game.id, botCount);
    }

    const botNames = game.bots.map(bot => `**${bot.avatar} ${bot.name}**`).join(', ');
    const humanSlots = humanPlayers - 1; // Creator is already added

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🎲 UNO Game Created!')
      .setDescription(`Game ID: **${game.id}**\n\n` +
        `✅ **${interaction.user.tag}** has created a game!\n` +
        (botCount > 0 ? `🤖 **AI Bots:** ${botNames}\n` : '') +
        `👥 **Human Players:** 1/${humanPlayers}\n` +
        `📍 **Channel:** <#${channelId}>\n\n` +
        `Use "/uno-join" to join this game.\n` +
        `Once all players join, use "/uno-begin" to start!`
      )
      .setFooter({ text: "Licensed under MPL-2.0" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
