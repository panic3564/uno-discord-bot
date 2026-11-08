/**
 * Player Statistics
 * Tracks per-user UNO statistics in memory and persists them to a JSON
 * file so they survive restarts. The file location can be configured
 * with the STATS_FILE environment variable (default: ./data/stats.json).
 *
 * Statistics are recorded from the game flow itself (gameManager and the
 * slash commands). Every recording function swallows its errors: a stats
 * failure must never break a game.
 */

const fs = require('fs');
const path = require('path');

// Default location: <working directory>/data/stats.json
const DEFAULT_FILE = path.join(process.cwd(), 'data', 'stats.json');

// In-memory statistics keyed by Discord user ID
const stats = new Map();

/**
 * Get the file path used to persist player statistics
 * @returns {string} Path to the stats file
 */
function getStatsFile() {
  return process.env.STATS_FILE || DEFAULT_FILE;
}

/**
 * Create a fresh statistics record with every counter at zero
 * @returns {Object} A new statistics record
 */
function createDefaultRecord() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    teamGamesPlayed: 0,
    teamGamesWon: 0,
    plus2Received: 0,
    plus4Received: 0,
    skipsReceived: 0,
    cardsDrawn: 0,
    cardsPlayed: 0,
    wildsPlayed: 0,
    unoCalls: 0,
    calloutsMade: 0,
    calledOutCount: 0,
    fastestWinMs: null,
  };
}

/**
 * Get (or lazily create) the statistics record for a user
 * @param {string} userId - Discord user ID
 * @returns {Object} The user's statistics record
 */
function getOrCreate(userId) {
  let record = stats.get(userId);
  if (!record) {
    record = createDefaultRecord();
    stats.set(userId, record);
  }
  return record;
}

/**
 * Get a user's statistics without creating an empty record
 * @param {string} userId - Discord user ID
 * @returns {Object|null} The record, or null when the user has none
 */
function getUserStats(userId) {
  return stats.get(userId) || null;
}

/**
 * Record a finished game: every human participant played it, and a human
 * winner additionally gets a win (plus team stats in team mode)
 * @param {Object} game - The finished game instance
 */
function recordGameFinished(game) {
  try {
    if (!game || !Array.isArray(game.players)) return;

    const withTeams = !!(game.options && game.options.withTeams);
    const winnerId = game.winner && game.winner.id;
    const start = game.startedAt || game.createdAt;
    const durationMs = game.endedAt && start
      ? new Date(game.endedAt).getTime() - new Date(start).getTime()
      : null;

    for (const player of game.players) {
      if (!player || !player.id || player.type === 'ai') continue;

      const record = getOrCreate(player.id);
      record.gamesPlayed += 1;
      if (withTeams) record.teamGamesPlayed += 1;

      if (winnerId === player.id) {
        record.gamesWon += 1;
        if (withTeams) record.teamGamesWon += 1;
        if (durationMs !== null && durationMs >= 0 &&
            (record.fastestWinMs === null || durationMs < record.fastestWinMs)) {
          record.fastestWinMs = durationMs;
        }
      }
    }
  } catch (error) {
    console.error('Error recording finished game stats:', error);
  }
}

/**
 * Record a draw penalty received by a player (Draw 2 or Wild Draw 4)
 * @param {Object} player - The player who received the penalty
 * @param {string} cardType - 'draw2' or 'wild4'
 * @param {number} cardsDrawn - Number of cards actually drawn
 */
function recordPenalty(player, cardType, cardsDrawn) {
  try {
    if (!player || !player.id || player.type === 'ai') return;

    const record = getOrCreate(player.id);
    if (cardType === 'wild4') {
      record.plus4Received += 1;
    } else {
      record.plus2Received += 1;
    }
    record.cardsDrawn += cardsDrawn || 0;
  } catch (error) {
    console.error('Error recording penalty stats:', error);
  }
}

/**
 * Record a turn lost to a Skip (or a Reverse in a two-player game)
 * @param {string} userId - Discord user ID
 */
function recordSkip(userId) {
  try {
    if (!userId) return;
    getOrCreate(userId).skipsReceived += 1;
  } catch (error) {
    console.error('Error recording skip stats:', error);
  }
}

/**
 * Record cards drawn voluntarily from the deck
 * @param {string} userId - Discord user ID
 * @param {number} count - Number of cards drawn
 */
function recordCardsDrawn(userId, count) {
  try {
    if (!userId) return;
    getOrCreate(userId).cardsDrawn += count || 0;
  } catch (error) {
    console.error('Error recording draw stats:', error);
  }
}

/**
 * Record a card played; wilds are counted separately
 * @param {string} userId - Discord user ID
 * @param {Object} card - The card that was played
 */
function recordCardPlayed(userId, card) {
  try {
    if (!userId) return;

    const record = getOrCreate(userId);
    record.cardsPlayed += 1;
    if (card && (card.type === 'wild' || card.type === 'wild4')) {
      record.wildsPlayed += 1;
    }
  } catch (error) {
    console.error('Error recording play stats:', error);
  }
}

/**
 * Record a player saying UNO
 * @param {string} userId - Discord user ID
 */
function recordUnoCall(userId) {
  try {
    if (!userId) return;
    getOrCreate(userId).unoCalls += 1;
  } catch (error) {
    console.error('Error recording UNO call stats:', error);
  }
}

/**
 * Record a successful UNO callout: the caller catches a player who
 * forgot to say UNO, and that player draws a 2-card penalty
 * @param {string} callerId - Discord user ID of the caller
 * @param {Object} calledPlayer - The player who was caught
 * @param {number} penaltyDrawn - Number of penalty cards actually drawn
 */
function recordCallout(callerId, calledPlayer, penaltyDrawn) {
  try {
    if (callerId) {
      getOrCreate(callerId).calloutsMade += 1;
    }
    if (calledPlayer && calledPlayer.id && calledPlayer.type !== 'ai') {
      const record = getOrCreate(calledPlayer.id);
      record.calledOutCount += 1;
      record.cardsDrawn += penaltyDrawn || 0;
    }
  } catch (error) {
    console.error('Error recording callout stats:', error);
  }
}

/**
 * Save all statistics to disk.
 * Errors are logged and swallowed: persistence must never crash the bot.
 */
function saveStats() {
  try {
    const file = getStatsFile();
    const state = {
      savedAt: new Date().toISOString(),
      stats: Array.from(stats.entries()),
    };

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving player stats:', error);
  }
}

/**
 * Restore previously saved statistics
 * @returns {boolean} True if statistics were restored, false otherwise
 */
function loadStats() {
  try {
    const file = getStatsFile();
    if (!fs.existsSync(file)) return false;

    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    const entries = Array.isArray(state.stats) ? state.stats : [];

    let restored = 0;
    for (const [userId, record] of entries) {
      if (!userId || !record) continue;
      // Merge over the default shape so records saved by an older version
      // do not surface undefined counters in /uno-stats
      stats.set(userId, { ...createDefaultRecord(), ...record });
      restored += 1;
    }

    console.log(`Restored ${restored} player stat record(s) from ${file}`);
    return true;
  } catch (error) {
    console.error('Error loading player stats:', error);
    return false;
  }
}

module.exports = {
  getUserStats,
  recordGameFinished,
  recordPenalty,
  recordSkip,
  recordCardsDrawn,
  recordCardPlayed,
  recordUnoCall,
  recordCallout,
  saveStats,
  loadStats,
  getStatsFile,
};
