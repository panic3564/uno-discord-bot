const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const config = require('../config/config');
const { token, botStatus } = config;
const fs = require('fs');
const path = require('path');
const gameManager = require('./utils/gameManager');
const unoBot = require('./utils/unoBot');
const cardDeck = require('./utils/cardDeck');
const persistence = require('./utils/persistence');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

// Command handling
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

/**
 * Recursively load commands from directory
 */
function loadCommandsFromDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      loadCommandsFromDirectory(filePath);
    } else if (file.endsWith('.js')) {
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }
}

loadCommandsFromDirectory(commandsPath);

// Event handling
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}



// AI Turn Processor - Check for AI turns every 5 seconds
let aiTurnInterval;
let saveInterval;

/**
 * Process all pending AI turns
 */
async function processAITurns() {
  try {
    const allGames = gameManager.getAllGames();
    
    for (const game of allGames) {
      if (game.status !== 'playing') continue;

      const currentPlayer = gameManager.getCurrentPlayer(game.id);
      if (!currentPlayer || currentPlayer.type !== 'ai') continue;

      // Check if it's been too long since last action (timeout)
      const now = new Date();
      const timeSinceLastAction = now - game.lastAction;
      const turnTimeout = game.turnTimeout || 30000; // 30 seconds

      if (timeSinceLastAction < 2000) continue; // Give a small buffer

      // Process AI turn
      const move = await gameManager.processAITurn(game.id, client);
      
      if (move) {
        console.log(`AI ${currentPlayer.name} made move: ${move.action}`);
        
        // Send message to channel or thread about AI's move
        // Try thread first, then fall back to channel
        const targetChannelId = game.threadId || game.channelId;
        if (targetChannelId) {
          const channel = await client.channels.fetch(targetChannelId).catch(() => null);
          if (channel) {
            const topCard = game.discardPile[game.discardPile.length - 1];
            let messageContent;
            
            if (move.action === 'play') {
              const card = move.data.card;
              let cardDisplay = `${cardDeck.getCardDisplayName(card)} ${cardDeck.getCardEmoji(card)}`;
              // If it's a wild card that changed color, show the chosen color
              if ((card.type === 'wild' || card.type === 'wild4') && (move.data.color || card.color)) {
                const chosenColor = move.data.color || card.color;
                cardDisplay += ` and chose **${chosenColor}**`;
              }
              // If it's a Wild Draw 4, mention the penalty
              if (card.type === 'wild4') {
                // The current player after moveToNextPlayer is the one who was skipped
                // The actual next player (who draws) is the one BEFORE the current player
                const allPlayers = [...game.players, ...game.bots];
                const currentIndex = game.currentPlayer;
                // The player who draws is the one we just skipped past
                const drawPlayerIndex = (currentIndex - game.direction + allPlayers.length) % allPlayers.length;
                const drawPlayer = allPlayers[drawPlayerIndex];
                const drawPlayerName = drawPlayer && drawPlayer.type === 'human' ? 
                  `<@${drawPlayer.id}>` : drawPlayer?.name || 'next player';
                cardDisplay += ` - ${drawPlayerName} draws 4 cards and loses their turn`;
              }
              messageContent = `${unoBot.getDisplayName(currentPlayer)} played **${cardDisplay}**`;
            } else if (move.action === 'draw') {
              messageContent = `${unoBot.getDisplayName(currentPlayer)} drew a card`;
            } else if (move.action === 'win') {
              messageContent = `🎉 ${unoBot.getDisplayName(currentPlayer)} wins the game! 🎉`;
            }
            
            if (messageContent) {
              // Send to thread if available
              if (game.threadId) {
                const threadChannel = await channel.threads.fetch(game.threadId).catch(() => null);
                if (threadChannel) {
                  await threadChannel.send(messageContent).catch(() => {});
                  // Update the status message
                  await gameManager.updateStatusMessage(game.id, client);
                } else {
                  await channel.send(messageContent).catch(() => {});
                }
              } else {
                await channel.send(messageContent).catch(() => {});
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing AI turns:', error);
  }
}

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Fail fast with a clear message when required configuration is missing,
// instead of failing later inside discord.js with an obscure error
const missingConfig = [
  ['DISCORD_TOKEN', config.token],
  ['CLIENT_ID', config.clientId],
  ['GUILD_ID', config.guildId],
].filter(([name, value]) => !value).map(([name]) => name);

if (missingConfig.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missingConfig.join(', ')}. ` +
      'Set them in your .env file (see .env.example) and restart the bot.'
  );
  process.exit(1);
}

// Login to Discord with your client's token
client.login(token).then(() => {
  console.log('Bot is online!');

  // Restore games saved before the last shutdown so a restart does not lose them
  persistence.loadGames();

  // Rebuild the auto-start timer for restored games still waiting for
  // players; timers cannot be persisted, so they are restarted on startup
  for (const game of gameManager.getAllGames()) {
    if (game.status === 'waiting') {
      gameManager.startGameTimer(game.id, client);
    }
  }

  // Start AI turn processor
  aiTurnInterval = setInterval(processAITurns, 5000);
  console.log('AI turn processor started');

  // Periodically persist the game state so an unexpected crash loses at
  // most one interval of progress
  saveInterval = setInterval(() => persistence.saveGames(), 30000);
  console.log('Game state autosave started');
}).catch((error) => {
  console.error('Failed to login:', error);
});

// Cleanup on exit
process.on('SIGINT', () => {
  if (aiTurnInterval) {
    clearInterval(aiTurnInterval);
  }
  if (saveInterval) {
    clearInterval(saveInterval);
  }
  // Persist the game state before shutting down
  persistence.saveGames();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (aiTurnInterval) {
    clearInterval(aiTurnInterval);
  }
  if (saveInterval) {
    clearInterval(saveInterval);
  }
  // Persist the game state before shutting down
  persistence.saveGames();
  client.destroy();
  process.exit(0);
});

module.exports = client;
