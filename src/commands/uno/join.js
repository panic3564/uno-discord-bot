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
    const channelId = interaction.channelId;

    // Find waiting games in this channel
    const existingGames = gameManager.getGamesByGuild(guildId);
    const waitingGame = existingGames.find(g => 
      g.channelId === channelId && 
      g.status === 'waiting' &&
      g.players.includes(userId) === false
    );

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
    const success = gameManager.addPlayer(waitingGame.id, userId);
    
    if (!success) {
      await interaction.reply({
        content: 'Failed to join the game. You might already be in it.',
        ephemeral: true,
      });
      return;
    }

    // Cancel existing timer and restart it (game might now be full)
    gameManager.cancelGameTimer(waitingGame.id);
    gameManager.startGameTimer(waitingGame.id, interaction.client);

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
        `📍 **Channel:** <#${channelId}>\n\n` +
        (isReady ? 
          `✅ **Game is ready!** Use "/uno-begin" to start.` :
          `⏳ **Waiting for more players...** (${expectedPlayers - humanPlayers} more needed)`
        )
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
