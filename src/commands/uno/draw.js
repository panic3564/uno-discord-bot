const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');
const cardDeck = require('../../utils/cardDeck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-draw')
    .setDescription('Draw a card from the deck')
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

    // Check if it's this user's turn
    const allPlayers = gameManager.getAllPlayers(activeGame.id);
    const currentPlayer = gameManager.getCurrentPlayer(activeGame.id);
    const userIndex = allPlayers.findIndex(p => p.id === userId);
    const currentPlayerIndex = allPlayers.findIndex(p => p.id === currentPlayer?.id);

    if (userIndex !== currentPlayerIndex) {
      await interaction.reply({
        content: `It's not your turn! Current player: ${currentPlayer?.name || allPlayers[currentPlayerIndex]?.name || 'Unknown'}`,
        ephemeral: true,
      });
      return;
    }

    // Get user's player object
    const userPlayer = allPlayers[userIndex];
    if (!userPlayer || !userPlayer.cards) {
      await interaction.reply({
        content: 'You are not in this game.',
        ephemeral: true,
      });
      return;
    }

    // Check if player has playable cards
    const topCard = activeGame.discardPile[activeGame.discardPile.length - 1];
    const playableCards = userPlayer.cards.filter(card => cardDeck.canPlayCard(card, topCard));

    // If player has playable cards, they must play one
    if (playableCards.length > 0) {
      await interaction.reply({
        content: `You have playable cards! You must play a card that matches the top card (${cardDeck.getCardDisplayName(topCard)}). Use /uno-hand to see your cards.`,
        ephemeral: true,
      });
      return;
    }

    // Draw a card
    const card = cardDeck.drawCard(activeGame.deck, activeGame.discardPile);
    
    if (!card) {
      await interaction.reply({
        content: 'The deck is empty and cannot be reshuffled!',
        ephemeral: true,
      });
      return;
    }

    userPlayer.cards.push(card);
    activeGame.lastAction = new Date();

    // Check if the drawn card is playable
    const isPlayable = cardDeck.canPlayCard(card, topCard);

    const embed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('📥 Card Drawn!')
      .setDescription(`**${userPlayer.name || userPlayer.id}** drew **${cardDeck.getCardDisplayName(card)}** ${cardDeck.getCardEmoji(card)}`)
      .addFields(
        { name: 'Cards Left', value: `${userPlayer.cards.length}`, inline: true },
        { name: 'Playable?', value: isPlayable ? '✅ Yes! You can play this card.' : '❌ No', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // If the drawn card is playable and it's still their turn, they can play it
    if (isPlayable) {
      await interaction.followUp({
        content: 'You can play this card now using `/uno-play`!',
        ephemeral: true,
      });
    } else {
      // Move to next player
      gameManager.moveToNextPlayer(activeGame);
    }
  },
};
