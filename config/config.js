require('dotenv').config();

// Auto-start timeout: GAME_START_TIMEOUT_MINUTES is expected to be a whole
// number of minutes. Unset, non-numeric or non-positive values fall back to
// the default instead of relying on NaN or 0 being falsy after multiplication.
const DEFAULT_GAME_START_TIMEOUT_MS = 120000; // 2 minutes

const gameStartTimeoutMinutes = Number.parseInt(process.env.GAME_START_TIMEOUT_MINUTES ?? '', 10);
const gameStartTimeout =
  Number.isFinite(gameStartTimeoutMinutes) && gameStartTimeoutMinutes > 0
    ? gameStartTimeoutMinutes * 60000
    : DEFAULT_GAME_START_TIMEOUT_MS;

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  botName: process.env.BOT_NAME || 'UNO Discord Bot',
  botStatus: process.env.BOT_STATUS || 'Playing UNO with you!',
  gameStartTimeout,
};
