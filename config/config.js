require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  botName: process.env.BOT_NAME || 'UNO Discord Bot',
  botStatus: process.env.BOT_STATUS || 'Playing UNO with you!',
};
