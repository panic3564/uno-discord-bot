const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-info')
    .setDescription('Display information about the UNO Discord Bot')
    .setDMPermission(true),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎲 UNO Discord Bot')
      .setDescription('A feature-rich Discord bot that allows users to play the popular card game UNO directly in Discord!')
      .addFields(
        {
          name: '📦 Features',
          value: '• Play UNO with friends\n• Play against AI opponents\n• Mix of human players and AI bots (up to 4 players)\n• All UNO special cards supported\n• Automatic turn management\n• Real-time game status',
          inline: false,
        },
        {
          name: '📚 Commands',
          value: 'Use `/help` to see all available commands\nUse `/uno-start` to create a new game',
          inline: false,
        },
        {
          name: '🔗 Links',
          value: '[GitHub Repository](https://github.com/panic3564/uno-discord-bot)\n[Report Issues](https://github.com/panic3564/uno-discord-bot/issues)',
          inline: false,
        },
        {
          name: '📜 License',
          value: 'This bot is open source and licensed under the **Mozilla Public License Version 2.0** (MPL-2.0).\n\nYou can view the full license text at:\n[LICENSE](https://github.com/panic3564/uno-discord-bot/blob/main/LICENSE)',
          inline: false,
        },
        {
          name: '💡 How to Play',
          value: '1. Use `/uno-start players:<n> [bots:<n>]` to create a game\n2. Players join with `/uno-join`\n3. Start with `/uno-begin`\n4. Play cards with `/uno-play <card-number>`\n5. Draw cards with `/uno-draw`\n6. Say UNO with `/uno` when you have 1 card left!',
          inline: false,
        },
        {
          name: '🤖 AI Opponents',
          value: 'AI bots have different strategies:\n• Easy: Plays first available card\n• Medium: Prioritizes special cards\n• Hard: Avoids helping opponents',
          inline: false,
        }
      )
      .setFooter({ text: 'Licensed under MPL-2.0' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
