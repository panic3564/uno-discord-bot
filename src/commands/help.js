const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays all available commands')
    .setDMPermission(true),
  async execute(interaction, client) {
    const commands = client.commands.map(cmd => {
      return {
        name: cmd.data.name,
        description: cmd.data.description || 'No description provided',
      };
    });

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Available Commands')
      .setDescription('Here are all the commands you can use:')
      .setFooter({ text: "Licensed under MPL-2.0" })
      .setTimestamp();

    commands.forEach(cmd => {
      embed.addFields({
        name: `${cmd.name}`,
        value: `${cmd.description}`,
        inline: true,
      });
    });

    await interaction.reply({ embeds: [embed] });
  },
};
