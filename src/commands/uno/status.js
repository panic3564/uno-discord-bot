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

    const allPlayers = gameManager.getAllPlayers(activeGame.id);
    const currentPlayer = gameManager.getCurrentPlayer(activeGame.id);
    const topCard = activeGame.discardPile[activeGame.discardPile.length - 1];
    const topCardDisplay = topCard ? cardDeck.getCardDisplayName(topCard) : 'No card yet';

    // Build player list with card counts
    const playerList = allPlayers.map(p => {
      const name = p.name || (p.type === 'ai' ? `**${p.avatar} ${p.name}**` : `<@${p.id}>`);
      const isCurrent = p.id === currentPlayer?.id || (p.name && currentPlayer?.name === p.name);
      const teamInfo = activeGame.options.withTeams ? ` [${gameManager.getPlayerTeam(activeGame.id, p.id) || '?'}]` : '';
      return `${isCurrent ? '➡️' : '   '} ${p.type === 'ai' ? '🤖' : '👤'} ${name}${teamInfo} - **${p.cards ? p.cards.length : 0}** cards`;
    }).join('\n');

    // Add team information if in team mode
    let teamInfo = '';
    if (activeGame.options.withTeams) {
      const { teamA, teamB } = gameManager.getTeamInfo(activeGame.id);
      const teamACards = teamA.reduce((sum, p) => sum + (p.cards ? p.cards.length : 0), 0);
      const teamBCards = teamB.reduce((sum, p) => sum + (p.cards ? p.cards.length : 0), 0);
      teamInfo = `\n**Teams:**\n` +
        `🔴 Team A: ${teamA.length} players, ${teamACards} total cards\n` +
        `🔵 Team B: ${teamB.length} players, ${teamBCards} total cards\n`;
    }

    const embed = new EmbedBuilder()
      .setColor(activeGame.status === 'playing' ? '#0000FF' : '#FFA500')
      .setTitle(`🎲 UNO Game Status - ${activeGame.status.toUpperCase()}`)
      .setDescription(`Game ID: **${activeGame.id}**\n` +
        `Created by: <@${activeGame.createdBy}>\n` +
        `📍 Channel: <#${channelId}>\n\n` +
        `🃏 **Top Card:** ${topCardDisplay} ${topCard ? cardDeck.getCardEmoji(topCard) : ''}\n` +
        `🔄 **Direction:** ${activeGame.direction === 1 ? '↻ Clockwise' : '↺ Counter-Clockwise'}\n\n` +
        `**Players:**\n${playerList}\n${teamInfo}` +
        (activeGame.status === 'waiting' ? 
          `⏳ **Waiting for players...** Use "/uno-join" to join or "/uno-begin" to start.` :
          `🎮 **Game in progress!** Current turn: ${currentPlayer?.name || currentPlayer?.id || 'Unknown'}`
        )
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
