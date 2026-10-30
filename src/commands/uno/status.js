const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');
const cardDeck = require('../../utils/cardDeck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-status')
    .setDescription('Check the status of an UNO game')
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    // Find active games in this channel
    const existingGames = gameManager.getGamesByGuild(guildId);
    const activeGame = existingGames.find(g => g.channelId === channelId && g.status !== 'finished');

    if (!activeGame) {
      await interaction.reply({
        content: 'No active UNO game found in this channel. Use `/uno-start` to create a new game.',
        ephemeral: true,
      });
      return;
    }

    const gameState = gameManager.getGameState(activeGame.id);
    const allPlayers = gameManager.getAllPlayers(activeGame.id);
    const currentPlayer = gameManager.getCurrentPlayer(activeGame.id);

    // Build player list with card counts
    const playerList = allPlayers.map(p => {
      const name = p.name || (p.type === 'ai' ? `**${p.avatar} ${p.name}**` : `<@${p.id}>`);
      const isCurrent = p.id === currentPlayer?.id || (p.name && currentPlayer?.name === p.name);
      return `${isCurrent ? '➡️' : '   '} ${p.type === 'ai' ? '🤖' : '👤'} ${name} - **${p.cards ? p.cards.length : 0}** cards`;
    }).join('\n');

    const topCard = activeGame.discardPile[activeGame.discardPile.length - 1];
    const topCardDisplay = topCard ? cardDeck.getCardDisplayName(topCard) : 'No card yet';

    const embed = new EmbedBuilder()
      .setColor(activeGame.status === 'playing' ? '#0000FF' : '#FFA500')
      .setTitle(`🎲 UNO Game Status - ${activeGame.status.toUpperCase()}`)
      .setDescription(`Game ID: **${activeGame.id}**\n` +
        `Created by: <@${activeGame.createdBy}>\n` +
        `📍 Channel: <#${channelId}>\n\n` +
        `🃏 **Top Card:** ${topCardDisplay} ${topCard ? cardDeck.getCardEmoji(topCard) : ''}\n` +
        `🔄 **Direction:** ${activeGame.direction === 1 ? '↻ Clockwise' : '↺ Counter-Clockwise'}\n\n` +
        `**Players:**\n${playerList}\n\n` +
        (activeGame.status === 'waiting' ? 
          `⏳ **Waiting for players...** Use "/uno-join" to join or "/uno-begin" to start.` :
          `🎮 **Game in progress!** Current turn: ${currentPlayer?.name || currentPlayer?.id || 'Unknown'}`
        )
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
