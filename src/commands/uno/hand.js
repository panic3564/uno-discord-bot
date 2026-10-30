const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');
const cardDeck = require('../../utils/cardDeck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-hand')
    .setDescription('View your current hand of cards (or your team member\'s hand in team mode)')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('Optional: View a teammate\'s hand (only in team mode)')
        .setRequired(false)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;
    const targetPlayer = interaction.options.getUser('player');

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

    if (!userPlayer || !userPlayer.cards || userPlayer.cards.length === 0) {
      await interaction.reply({
        content: 'You are not in this game or have no cards.',
        ephemeral: true,
      });
      return;
    }

    let playerToShow = userPlayer;
    let isViewingTeammate = false;

    // If a target player is specified and team mode is enabled
    if (targetPlayer && activeGame.options.withTeams) {
      const targetPlayerObj = allPlayers.find(p => p.id === targetPlayer.id);
      
      if (!targetPlayerObj) {
        await interaction.reply({
          content: 'That player is not in this game.',
          ephemeral: true,
        });
        return;
      }

      // Check if the target player is on the same team as the requester
      const isSameTeam = gameManager.arePlayersOnSameTeam(activeGame.id, userId, targetPlayer.id);
      
      if (!isSameTeam) {
        await interaction.reply({
          content: 'You can only view your own hand or your teammate\'s hand in team mode.',
          ephemeral: true,
        });
        return;
      }

      playerToShow = targetPlayerObj;
      isViewingTeammate = true;
    }

    // Build card list
    const cardList = playerToShow.cards.map((card, index) => {
      const displayName = cardDeck.getCardDisplayName(card);
      const emoji = cardDeck.getCardEmoji(card);
      return `${index + 1}. ${emoji} **${displayName}**`;
    }).join('\n');

    const isYourTurn = activeGame.currentPlayer === allPlayers.indexOf(userPlayer);
    const playerName = playerToShow.name || playerToShow.id;

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`🃏 ${isViewingTeammate ? `Teammate's Hand` : 'Your Hand'} (${playerToShow.cards.length} cards)`)
      .setDescription(cardList)
      .setFooter({ text: `Game: ${activeGame.id} | Your turn: ${isYourTurn ? '✅ YES' : '❌ No'}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
