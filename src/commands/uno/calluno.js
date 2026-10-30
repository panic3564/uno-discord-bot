const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');
const cardDeck = require('../../utils/cardDeck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-calluno')
    .setDescription('Call out a player who forgot to say UNO')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to call out for not saying UNO')
        .setRequired(true)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;
    const calledPlayer = interaction.options.getUser('player');

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

    // Check if the caller is in the game
    const allPlayers = gameManager.getAllPlayers(activeGame.id);
    const callerPlayer = allPlayers.find(p => p.id === userId);

    if (!callerPlayer) {
      await interaction.reply({
        content: 'You are not in this game.',
        ephemeral: true,
      });
      return;
    }

    // Find the called player in the game
    const calledPlayerObj = allPlayers.find(p => p.id === calledPlayer.id);

    if (!calledPlayerObj) {
      await interaction.reply({
        content: `That player is not in this game.`,
        ephemeral: true,
      });
      return;
    }

    // Check if the called player has exactly 1 card and hasn't said UNO
    if (!calledPlayerObj.cards || calledPlayerObj.cards.length !== 1) {
      await interaction.reply({
        content: `${calledPlayer.tag} does not have exactly 1 card, so they don't need to say UNO.`,
        ephemeral: true,
      });
      return;
    }

    if (calledPlayerObj.saidUno) {
      await interaction.reply({
        content: `${calledPlayer.tag} already said UNO!`,
        ephemeral: true,
      });
      return;
    }

    // Check if the caller is the next player (only next player can call UNO)
    const currentPlayer = gameManager.getCurrentPlayer(activeGame.id);
    const currentPlayerIndex = allPlayers.findIndex(p => p.id === currentPlayer?.id);
    const callerIndex = allPlayers.findIndex(p => p.id === userId);
    const calledPlayerIndex = allPlayers.findIndex(p => p.id === calledPlayer.id);

    // The player can only be called out by the next player in turn order
    // In UNO, anyone can call out a player who forgot to say UNO
    // But traditionally, the next player in turn order is the one who notices
    // For this implementation, we'll allow any player to call out

    // Mark that the player was caught
    calledPlayerObj.saidUno = true; // Mark as caught (they said it, but too late)
    calledPlayerObj.wasCalledOut = true; // Flag that they were called out

    // Draw 1 card as penalty
    const card = cardDeck.drawCard(activeGame.deck, activeGame.discardPile);
    if (card) {
      calledPlayerObj.cards.push(card);
    }

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚨 UNO Called Out!')
      .setDescription(`${calledPlayer.tag} forgot to say UNO and was called out by ${interaction.user.tag}!`)
      .addFields(
        { name: 'Penalty', value: `${calledPlayer.tag} draws 1 card`, inline: true },
        { name: 'Cards Now', value: `${calledPlayerObj.cards.length} cards`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
