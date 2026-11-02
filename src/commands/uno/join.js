const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-join')
    .setDescription('Join an existing UNO game')
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const channelId = interaction.channelId;

    // Check if user is already in any game in this guild
    const existingGames = gameManager.getGamesByGuild(guildId);
    const userGame = existingGames.find(g => g.players.includes(userId));
    if (userGame) {
      await interaction.reply({
        content: `You are already in a game in this server. You can only join one game at a time per server.`,
        ephemeral: true,
      });
      return;
    }

    // Find waiting games in this channel or thread
    const waitingGame = existingGames.find(g => 
      (g.channelId === channelId || g.threadId === channelId) && 
      g.status === 'waiting' &&
      g.players.includes(userId) === false
    );

    // Also check if the command was run in a thread
    if (!waitingGame && interaction.channel?.isThread()) {
      const threadGame = existingGames.find(g => g.threadId === channelId && g.status === 'waiting' && g.players.includes(userId) === false);
      if (threadGame) {
        waitingGame = threadGame;
      }
    }

    if (!waitingGame) {
      await interaction.reply({
        content: 'No waiting game found in this channel that you can join. Use `/uno-start` to create a new game.',
        ephemeral: true,
      });
      return;
    }

    // Check if game is full
    const totalPlayers = waitingGame.players.length + waitingGame.bots.length;
    const maxPlayers = waitingGame.options.maxPlayers || 4;
    
    if (totalPlayers >= maxPlayers) {
      await interaction.reply({
        content: `This game is already full (${totalPlayers}/${maxPlayers} players).`,
        ephemeral: true,
      });
      return;
    }

    // Add player to game
    const success = gameManager.addPlayer(waitingGame.id, userId, username);
    
    if (!success) {
      await interaction.reply({
        content: 'Failed to join the game. You might already be in it.',
        ephemeral: true,
      });
      return;
    }

    // Add player to the game thread
    if (waitingGame.threadId) {
      try {
        const threadChannel = await interaction.channel.threads.fetch(waitingGame.threadId).catch(() => null);
        if (threadChannel) {
          await threadChannel.members.add(userId);
          // Notify in thread
          await threadChannel.send(`<@${userId}> has joined the game!`);
        }
      } catch (error) {
        console.error('Error adding user to thread:', error);
      }
    }

    // Cancel existing timer and restart it (game might now be full)
    gameManager.cancelGameTimer(waitingGame.id);
    gameManager.startGameTimer(waitingGame.id, interaction.client);

    // Update the status message in the thread
    if (waitingGame.threadId) {
      await gameManager.updateStatusMessage(waitingGame.id, interaction.client);
    }

    // Check if game is ready to start
    const humanPlayers = waitingGame.players.length;
    const expectedPlayers = waitingGame.options.players || 2;
    const isReady = humanPlayers >= expectedPlayers;

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Joined UNO Game!')
      .setDescription(`You have joined game **${waitingGame.id}**\n\n` +
        `👥 **Players:** ${waitingGame.players.length}/${expectedPlayers}\n` +
        (waitingGame.bots.length > 0 ? `🤖 **Bots:** ${waitingGame.bots.length}\n` : '') +
        `📍 **Game Thread:** <#${waitingGame.threadId}>\n\n` +
        (isReady ? 
          `✅ **Game is ready!** Use "/uno-begin" to start.` :
          `⏳ **Waiting for more players...** (${expectedPlayers - humanPlayers} more needed)`
        )
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
