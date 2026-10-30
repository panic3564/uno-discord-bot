const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');
const cardDeck = require('../../utils/cardDeck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-begin')
    .setDescription('Start the UNO game')
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

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

    // Validate game setup
    const validation = gameManager.validateGameSetup(waitingGame.id);
    if (!validation.isValid) {
      await interaction.reply({
        content: `Cannot start game: ${validation.message}`,
        ephemeral: true,
      });
      return;
    }

    // Start the game
    const success = gameManager.startGame(waitingGame.id);
    
    if (!success) {
      await interaction.reply({
        content: 'Failed to start the game.',
        ephemeral: true,
      });
      return;
    }

    const game = gameManager.getGame(waitingGame.id);
    const allPlayers = gameManager.getAllPlayers(waitingGame.id);
    const topCard = game.discardPile[game.discardPile.length - 1];

    // Build player list
    const playerList = allPlayers.map(p => {
      const name = p.name || (p.type === 'ai' ? `**${p.avatar} ${p.name}**` : `<@${p.id}>`);
      return `${p.type === 'ai' ? '🤖' : '👤'} ${name} - ${p.cards ? p.cards.length : 0} cards`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#0000FF')
      .setTitle('🎲 UNO Game Started!')
      .setDescription(`Game ID: **${game.id}**\n\n` +
        `🃏 **Top Card:** ${cardDeck.getCardDisplayName(topCard)}\n` +
        `📍 **Channel:** <#${channelId}>\n\n` +
        `**Players:**\n${playerList}\n\n` +
        `Current turn: <@${allPlayers[game.currentPlayer]?.id}> or ${allPlayers[game.currentPlayer]?.name}`
      )
      .setFooter({ text: "Licensed under MPL-2.0" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // TODO: Start game loop or notify first player
    // This would involve setting up turn-based gameplay
    // For now, just display the initial state
  },
};
