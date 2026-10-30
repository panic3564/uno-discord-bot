const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const { token, botStatus } = require('../config/config');
const fs = require('fs');
const path = require('path');
const gameManager = require('./utils/gameManager');
const unoBot = require('./utils/unoBot');
const cardDeck = require('./utils/cardDeck');

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
        
        // Send message to channel about AI's move
        if (game.channelId) {
          const channel = await client.channels.fetch(game.channelId).catch(() => null);
          if (channel) {
            const topCard = game.discardPile[game.discardPile.length - 1];
            let messageContent;
            
            if (move.action === 'play') {
              const card = move.data.card;
              messageContent = `${unoBot.getDisplayName(currentPlayer)} played **${cardDeck.getCardDisplayName(card)}** ${cardDeck.getCardEmoji(card)}`;
            } else if (move.action === 'draw') {
              messageContent = `${unoBot.getDisplayName(currentPlayer)} drew a card`;
            } else if (move.action === 'win') {
              messageContent = `🎉 ${unoBot.getDisplayName(currentPlayer)} wins the game! 🎉`;
            }
            
            if (messageContent) {
              await channel.send(messageContent).catch(() => {});
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

// Login to Discord with your client's token
client.login(token).then(() => {
  console.log('Bot is online!');
  
  // Start AI turn processor
  aiTurnInterval = setInterval(processAITurns, 5000);
  console.log('AI turn processor started');
}).catch((error) => {
  console.error('Failed to login:', error);
});

// Cleanup on exit
process.on('SIGINT', () => {
  if (aiTurnInterval) {
    clearInterval(aiTurnInterval);
  }
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (aiTurnInterval) {
    clearInterval(aiTurnInterval);
  }
  client.destroy();
  process.exit(0);
});

module.exports = client;
