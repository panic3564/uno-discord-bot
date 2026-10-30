const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-start')
    .setDescription('Start a new UNO game')
    .addIntegerOption(option =>
      option.setName('players')
        .setDescription('Number of players (2-10)')
        .setMinValue(2)
        .setMaxValue(10)
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('with-bots')
        .setDescription('Include AI bots in the game')
        .setRequired(false)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const players = interaction.options.getInteger('players');
    const withBots = interaction.options.getBoolean('with-bots') || false;

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('UNO Game Starting!')
      .setDescription(`Starting a new UNO game with ${players} players${withBots ? ' (including bots)' : ''}`)
      .addFields(
        { name: 'Players', value: `${players}`, inline: true },
        { name: 'With Bots', value: withBots ? 'Yes' : 'No', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
