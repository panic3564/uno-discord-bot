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

    // Find the waiting game in this channel or its game thread
    const waitingGame = gameManager.findGameByChannel(guildId, channelId, { status: 'waiting' });

    if (!waitingGame) {
      await interaction.reply({
        content: 'No waiting game found in this channel that you created. Use `/uno-start` to create a new game.',
        ephemeral: true,
      });
      return;
    }

    // Only the creator may start the game, except when the command is run
    // from inside the game thread
    if (waitingGame.createdBy !== userId && !(interaction.channel?.isThread() && waitingGame.threadId === channelId)) {
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

    // Display the current player correctly for both humans and AI
    const current = allPlayers[game.currentPlayer];
    const currentPlayerDisplay = current
      ? (current.type === 'ai' ? `${current.avatar} ${current.name}` : `<@${current.id}>`)
      : 'Unknown';

    const embed = new EmbedBuilder()
      .setColor('#0000FF')
      .setTitle('🎲 UNO Game Started!')
      .setDescription(`Game ID: **${game.id}**\n\n` +
        `🃏 **Top Card:** ${cardDeck.getCardDisplayName(topCard)}\n` +
        `📍 **Game Thread:** <#${game.threadId}>\n\n` +
        `**Players:**\n${playerList}\n\n` +
        `Current turn: ${currentPlayerDisplay}`
      )
      .setTimestamp();

    // Add all players to the thread
    if (game.threadId) {
      try {
        const threadChannel = await interaction.client.channels.fetch(game.threadId).catch(() => null);
        if (threadChannel) {
          // Add all human players to thread
          for (const player of allPlayers) {
            if (player.type === 'human' && player.id) {
              await threadChannel.members.add(player.id).catch(() => {});
            }
          }
        }
      } catch (error) {
        console.error('Error adding players to thread:', error);
      }
      // Update the status message in the thread
      await gameManager.updateStatusMessage(game.id, interaction.client);
    }

    await interaction.reply({ embeds: [embed] });

    // Post start notification in thread
    if (game.threadId) {
      try {
        const threadChannel = await interaction.client.channels.fetch(game.threadId).catch(() => null);
        if (threadChannel) {
          const startEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('\u2705 Game Started!')
            .setDescription(`<@${userId}> has started the game!\n\n` +
              `\ud83c\udccf **Top Card:** ${cardDeck.getCardDisplayName(topCard)}\n` +
              `**Players:**\n${playerList}\n\n` +
              `Current turn: ${currentPlayerDisplay}`
            )
            .setTimestamp();
          await threadChannel.send({ embeds: [startEmbed] });
        }
      } catch (error) {
        console.error('Error posting start message to thread:', error);
      }
    }

    // TODO: Start game loop or notify first player
    // This would involve setting up turn-based gameplay
    // For now, just display the initial state
  },
};
