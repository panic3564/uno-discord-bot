/**
 * Game State Persistence
 * Saves and restores the in-memory game state so that a bot restart does
 * not lose active games. State is written to a JSON file whose location
 * can be configured with the PERSISTENCE_FILE environment variable.
 */

const fs = require('fs');
const path = require('path');
const gameManager = require('./gameManager');

// Default location: <working directory>/data/games.json
const DEFAULT_FILE = path.join(process.cwd(), 'data', 'games.json');

// Date-valued game fields, serialized as ISO strings by JSON.stringify
// and revived when the state is restored
const DATE_FIELDS = ['createdAt', 'lastAction', 'endedAt'];

/**
 * Get the file path used to persist game state
 * @returns {string} Path to the persistence file
 */
function getPersistenceFile() {
  return process.env.PERSISTENCE_FILE || DEFAULT_FILE;
}

/**
 * Save the current game state to disk.
 * Errors are logged and swallowed: persistence must never crash the bot.
 */
function saveGames() {
  try {
    const file = getPersistenceFile();
    const state = {
      savedAt: new Date().toISOString(),
      games: Array.from(gameManager.games.values()),
      pendingGames: Array.from(gameManager.pendingGames.entries()),
    };

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}

/**
 * Restore previously saved games into the game manager
 * @returns {boolean} True if games were restored, false otherwise
 */
function loadGames() {
  try {
    const file = getPersistenceFile();
    if (!fs.existsSync(file)) return false;

    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    const games = Array.isArray(state.games) ? state.games : [];

    for (const game of games) {
      for (const field of DATE_FIELDS) {
        if (game[field]) game[field] = new Date(game[field]);
      }
      gameManager.games.set(game.id, game);
    }

    const pending = Array.isArray(state.pendingGames) ? state.pendingGames : [];
    for (const [guildId, gameId] of pending) {
      if (gameManager.games.has(gameId)) {
        gameManager.pendingGames.set(guildId, gameId);
      }
    }

    console.log(`Restored ${games.length} game(s) from ${file}`);
    return true;
  } catch (error) {
    console.error('Error loading game state:', error);
    return false;
  }
}

module.exports = { saveGames, loadGames, getPersistenceFile };
