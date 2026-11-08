const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const stats = require('../../utils/stats');

/**
 * Format a duration in milliseconds for display
 * @param {number|null} ms - Duration in milliseconds
 * @returns {string} Human-readable duration
 */
function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno-stats')
    .setDescription('View UNO statistics for yourself or another player')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player whose stats to view (defaults to you)')
        .setRequired(false)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getUser('player') || interaction.user;
    const record = stats.getUserStats(target.id);

    if (!record) {
      await interaction.reply(`${target.tag} has not played any UNO games yet.`);
      return;
    }

    const winRate = record.gamesPlayed > 0
      ? `${((record.gamesWon / record.gamesPlayed) * 100).toFixed(1)}%`
      : '0%';
    const penaltyCards = (record.plus2Received * 2) + (record.plus4Received * 4);

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(`📊 UNO Stats - ${target.tag}`)
      .addFields(
        {
          name: '🎮 Games',
          value: `Played: **${record.gamesPlayed}**\nWon: **${record.gamesWon}**\nWin rate: **${winRate}**`,
          inline: true,
        },
        {
          name: '🤝 Team Games',
          value: `Played: **${record.teamGamesPlayed}**\nWon: **${record.teamGamesWon}**`,
          inline: true,
        },
        {
          name: '⚡ Fastest Win',
          value: formatDuration(record.fastestWinMs),
          inline: true,
        },
        {
          name: '🍀 Bad Luck',
          value: `+2s received: **${record.plus2Received}**\n+4s received: **${record.plus4Received}**\nPenalty cards: **${penaltyCards}**\nTimes skipped: **${record.skipsReceived}**\nCaught without UNO: **${record.calledOutCount}**`,
          inline: true,
        },
        {
          name: '🃏 Cards',
          value: `Played: **${record.cardsPlayed}**\nDrawn: **${record.cardsDrawn}**\nWilds played: **${record.wildsPlayed}**`,
          inline: true,
        },
        {
          name: '🚨 UNO Calls',
          value: `Said UNO: **${record.unoCalls}**\nCallouts made: **${record.calloutsMade}**`,
          inline: true,
        },
      )
      .setTimestamp();

    // Deliberately public (not ephemeral) so everyone can see the stats
    await interaction.reply({ embeds: [embed] });
  },
};
