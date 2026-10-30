const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gameManager = require('../../utils/gameManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-addbot')
    .setDescription('Add AI bots to an existing UNO game')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of bots to add (1-3)')
        .setMinValue(1)
        .setMaxValue(3)
        .setRequired(true)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;
    const count = interaction.options.getInteger('count');

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

    // Check if adding bots would exceed max players
    const totalPlayers = waitingGame.players.length + waitingGame.bots.length;
    const maxPlayers = waitingGame.options.maxPlayers || 4;
    
    if (totalPlayers + count > maxPlayers) {
      await interaction.reply({
        content: `Cannot add ${count} bots. Game would have ${totalPlayers + count} players, exceeding the maximum of ${maxPlayers}.`,
        ephemeral: true,
      });
      return;
    }

    // Add bots
    const newBots = gameManager.addBots(waitingGame.id, count);
    
    if (newBots.length === 0) {
      await interaction.reply({
        content: 'Failed to add bots to the game.',
        ephemeral: true,
      });
      return;
    }

    const botNames = newBots.map(bot => `**${bot.avatar} ${bot.name}**`).join(', ');
    const totalBots = waitingGame.bots.length;

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🤖 AI Bots Added!')
      .setDescription(`Added **${count}** AI bot(s) to game **${waitingGame.id}**\n\n` +
        `🤖 **New Bots:** ${botNames}\n` +
        `👥 **Total Players:** ${waitingGame.players.length} humans + ${totalBots} bots = ${totalPlayers + count} total\n` +
        `📍 **Channel:** <#${channelId}>\n\n` +
        `Use "/uno-begin" to start the game!`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
