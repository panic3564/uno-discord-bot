const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Say UNO when you have one card left')
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    // Find active games in this channel
    const existingGames = gameManager.getGamesByGuild(guildId);
    const activeGame = existingGames.find(g => 
      g.channelId === channelId && 
      g.status === 'playing'
    );

    if (!activeGame) {
      await interaction.reply({
        content: 'There is no active UNO game in this channel.',
        ephemeral: true,
      });
      return;
    }

    // Find the user's player object
    const allPlayers = gameManager.getAllPlayers(activeGame.id);
    const userPlayer = allPlayers.find(p => p.id === userId);

    if (!userPlayer || !userPlayer.cards) {
      await interaction.reply({
        content: 'You are not in this game.',
        ephemeral: true,
      });
      return;
    }

    // Check if player has exactly one card
    if (userPlayer.cards.length !== 1) {
      await interaction.reply({
        content: `You have ${userPlayer.cards.length} cards. Say UNO only when you have one card left!`,
        ephemeral: true,
      });
      return;
    }

    // Check if they already said UNO
    if (userPlayer.saidUno) {
      await interaction.reply({
        content: 'You already said UNO!',
        ephemeral: true,
      });
      return;
    }

    // Mark that they said UNO
    userPlayer.saidUno = true;

    const embed = new EmbedBuilder()
      .setColor('#FFFF00')
      .setTitle('🟡 UNO!')
      .setDescription(`**${userPlayer.name || userPlayer.id}** said UNO! They have 1 card left.`) 
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
