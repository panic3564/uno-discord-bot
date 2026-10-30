const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');
const cardDeck = require('../../utils/cardDeck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-play')
    .setDescription('Play a card from your hand')
    .addIntegerOption(option =>
      option.setName('card-number')
        .setDescription('The number of the card to play (from /uno-hand)')
        .setMinValue(1)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Choose a color for Wild cards (red, blue, green, yellow)')
        .setRequired(false)
        .addChoices(
          { name: 'Red', value: 'red' },
          { name: 'Blue', value: 'blue' },
          { name: 'Green', value: 'green' },
          { name: 'Yellow', value: 'yellow' }
        )
    )
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;
    const cardNumber = interaction.options.getInteger('card-number');
    const colorChoice = interaction.options.getString('color');

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

    // Get user's cards
    const userPlayer = allPlayers[userIndex];
    if (!userPlayer || !userPlayer.cards || userPlayer.cards.length === 0) {
      await interaction.reply({
        content: 'You have no cards to play!',
        ephemeral: true,
      });
      return;
    }

    // Validate card number
    if (cardNumber < 1 || cardNumber > userPlayer.cards.length) {
      await interaction.reply({
        content: `Invalid card number. You have ${userPlayer.cards.length} cards. Use /uno-hand to see your cards.`,
        ephemeral: true,
      });
      return;
    }

    const selectedCard = userPlayer.cards[cardNumber - 1];
    const topCard = activeGame.discardPile[activeGame.discardPile.length - 1];

    // Check if card is playable
    const isPlayable = cardDeck.canPlayCard(selectedCard, topCard);

    // Wild cards are always playable but need a color
    if (selectedCard.type === 'wild' || selectedCard.type === 'wild4') {
      if (!colorChoice) {
        await interaction.reply({
          content: 'You must choose a color for Wild cards!',
          ephemeral: true,
        });
        return;
      }
    } else if (!isPlayable) {
      await interaction.reply({
        content: `You cannot play **${cardDeck.getCardDisplayName(selectedCard)}**. It doesn't match the top card (${cardDeck.getCardDisplayName(topCard)}).`,
        ephemeral: true,
      });
      return;
    }

    // Process the card play
    // Remove card from player's hand
    userPlayer.cards.splice(cardNumber - 1, 1);

    // Set color for wild cards
    if (selectedCard.type === 'wild' || selectedCard.type === 'wild4') {
      selectedCard.color = colorChoice;
    }

    // Add card to discard pile
    activeGame.discardPile.push(selectedCard);

    // Check if player has one card left (UNO!)
    if (userPlayer.cards.length === 1) {
      userPlayer.saidUno = false; // They need to say UNO
      // In a real implementation, you'd check if they said UNO
    }

    // Check if player won
    if (userPlayer.cards.length === 0) {
      activeGame.status = 'finished';
      activeGame.winner = userPlayer;

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎉 GAME OVER! 🎉')
        .setDescription(`**${userPlayer.name || userPlayer.id}** wins the game! 🏆`)
      .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Handle special cards
    switch (selectedCard.type) {
      case 'skip':
        // Skip next player
        gameManager.moveToNextPlayer(activeGame);
        break;
      case 'reverse':
        // Reverse direction
        activeGame.direction *= -1;
        break;
      case 'draw2':
        // Next player draws 2 cards
        gameManager.moveToNextPlayer(activeGame);
        const nextPlayer = gameManager.getCurrentPlayer(activeGame.id);
        if (nextPlayer && nextPlayer.cards) {
          for (let i = 0; i < 2; i++) {
            const card = cardDeck.drawCard(activeGame.deck, activeGame.discardPile);
            if (card) nextPlayer.cards.push(card);
          }
        }
        break;
      case 'wild4':
        // Next player draws 4 cards
        gameManager.moveToNextPlayer(activeGame);
        const nextPlayerWild = gameManager.getCurrentPlayer(activeGame.id);
        if (nextPlayerWild && nextPlayerWild.cards) {
          for (let i = 0; i < 4; i++) {
            const card = cardDeck.drawCard(activeGame.deck, activeGame.discardPile);
            if (card) nextPlayerWild.cards.push(card);
          }
        }
        break;
      default:
        // Regular card, move to next player
        gameManager.moveToNextPlayer(activeGame);
    }

    // If not a skip card, move to next player
    if (selectedCard.type !== 'skip' && selectedCard.type !== 'draw2' && selectedCard.type !== 'wild4') {
      gameManager.moveToNextPlayer(activeGame);
    }

    activeGame.lastAction = new Date();

    const embed = new EmbedBuilder()
      .setColor('#0000FF')
      .setTitle('✅ Card Played!')
      .setDescription(`**${userPlayer.name || userPlayer.id}** played **${cardDeck.getCardDisplayName(selectedCard)}** ${cardDeck.getCardEmoji(selectedCard)}`)
      .addFields(
        { name: 'Cards Left', value: `${userPlayer.cards.length}`, inline: true },
        { name: 'Next Player', value: gameManager.getCurrentPlayer(activeGame.id)?.name || 'Unknown', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // If next player is AI, trigger AI turn after a delay
    const nextPlayer = gameManager.getCurrentPlayer(activeGame.id);
    if (nextPlayer && nextPlayer.type === 'ai') {
      // AI will be processed by the interval in index.js
    }
  },
};
