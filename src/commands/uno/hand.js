const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');
const cardDeck = require('../../utils/cardDeck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-hand')
    .setDescription('View your current hand of cards (ephemeral - only you can see this)')
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    // Find active games in this channel
    const existingGames = gameManager.getGamesByGuild(guildId);
    const activeGame = existingGames.find(g => 
      g.channelId === channelId && 
      g.status === 'playing' &&
      g.players.includes(userId)
    );

    if (!activeGame) {
      await interaction.reply({
        content: 'You are not currently in an active UNO game in this channel.',
        ephemeral: true,
      });
      return;
    }

    // Find the user's player object
    const allPlayers = gameManager.getAllPlayers(activeGame.id);
    const userPlayer = allPlayers.find(p => p.id === userId);

    if (!userPlayer || !userPlayer.cards || userPlayer.cards.length === 0) {
      await interaction.reply({
        content: 'You have no cards in your hand.',
        ephemeral: true,
      });
      return;
    }

    // Build card list
    const cardList = userPlayer.cards.map((card, index) => {
      const displayName = cardDeck.getCardDisplayName(card);
      const emoji = cardDeck.getCardEmoji(card);
      return `${index + 1}. ${emoji} **${displayName}**`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`🃏 Your Hand (${userPlayer.cards.length} cards)`)
      .setDescription(cardList)
      .setFooter({ text: `Game: ${activeGame.id} | Your turn: ${activeGame.currentPlayer === allPlayers.indexOf(userPlayer) ? '✅ YES' : '❌ No'}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
