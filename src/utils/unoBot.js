/**
 * UNO AI Bot Logic
 * Handles AI player decision-making and game actions
 */

const cardDeck = require('./cardDeck');

class UNOBot {
  constructor() {
    this.botNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'];
    this.botAvatars = ['🤖', '🎮', '🎲', '🎯', '🎴', '🎰', '🎳', '🎪'];
  }

  /**
   * Validate and normalize difficulty level
   * @param {string} difficulty - Difficulty level
   * @returns {string} Validated difficulty (easy, medium, or hard)
   */
  validateDifficulty(difficulty) {
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (validDifficulties.includes(difficulty?.toLowerCase())) {
      return difficulty.toLowerCase();
    }
    return 'medium'; // Default to medium
  }

  /**
   * Get difficulty display name with emoji
   * @param {string} difficulty - Difficulty level
   * @returns {string} Display name with emoji
   */
  getDifficultyDisplay(difficulty) {
    const displayNames = {
      easy: '🟢 Easy',
      medium: '🟡 Medium',
      hard: '🔴 Hard',
    };
    return displayNames[difficulty?.toLowerCase()] || displayNames.medium;
  }

  /**
   * Create a new AI player
   * @param {string} gameId - The game ID
   * @param {number} botIndex - Index for unique bot naming
   * @param {string} difficulty - Difficulty level (easy, medium, hard)
   * @returns {Object} AI player object
   */
  createBot(gameId, botIndex = 0, difficulty = 'medium') {
    const nameIndex = botIndex % this.botNames.length;
    return {
      id: `bot-${gameId}-${botIndex}`,
      name: this.botNames[nameIndex],
      avatar: this.botAvatars[nameIndex % this.botAvatars.length],
      type: 'ai',
      difficulty: this.validateDifficulty(difficulty),
      cards: [],
      saidUno: false,
      isActive: true,
      createdAt: new Date(),
    };
  }

  /**
   * Get AI think time based on difficulty
   * @param {string} difficulty - Difficulty level
   * @returns {number} Think time in milliseconds
   */
  getThinkTime(difficulty) {
    const thinkTimes = {
      easy: 500,
      medium: 1500,
      hard: 2500,
    };
    return thinkTimes[difficulty] || 1500;
  }

  /**
   * AI makes a move in the game
   * @param {Object} game - The game instance
   * @param {Object} bot - The AI bot player
   * @param {Object} client - Discord client
   * @returns {Object} The move object with action and data
   */
  async makeMove(game, bot, client) {
    // Simulate thinking time based on difficulty
    await this.delay(this.getThinkTime(bot.difficulty));

    const topCard = game.discardPile[game.discardPile.length - 1];
    const playableCards = this.getPlayableCards(bot.cards, topCard, game);

    // Strategy based on difficulty
    let move;
    switch (bot.difficulty) {
      case 'easy':
        move = this.easyStrategy(playableCards, bot, game, topCard);
        break;
      case 'medium':
        move = this.mediumStrategy(playableCards, bot, game, topCard);
        break;
      case 'hard':
        move = this.hardStrategy(playableCards, bot, game, topCard);
        break;
      default:
        move = this.mediumStrategy(playableCards, bot, game, topCard);
    }

    return move;
  }

  /**
   * Easy AI strategy - plays first available card
   * @param {Array} playableCards - Cards that can be played
   * @param {Object} bot - The AI bot player
   * @param {Object} game - The game instance
   * @param {Object} topCard - The top card of discard pile
   * @returns {Object} Move object
   */
  easyStrategy(playableCards, bot, game, topCard) {
    if (playableCards.length === 0) {
      return { action: 'draw', data: null };
    }

    // Just play the first playable card
    const card = playableCards[0];
    return { action: 'play', data: { card, color: null } };
  }

  /**
   * Medium AI strategy - tries to play special cards first
   * @param {Array} playableCards - Cards that can be played
   * @param {Object} bot - The AI bot player
   * @param {Object} game - The game instance
   * @param {Object} topCard - The top card of discard pile
   * @returns {Object} Move object
   */
  mediumStrategy(playableCards, bot, game, topCard) {
    if (playableCards.length === 0) {
      return { action: 'draw', data: null };
    }

    // Sort by priority: special cards first, then high value cards
    const priorityCards = [...playableCards].sort((a, b) => {
      const aPriority = this.getCardPriority(a, game);
      const bPriority = this.getCardPriority(b, game);
      return bPriority - aPriority;
    });

    const card = priorityCards[0];
    let color = null;

    // If it's a wild card, choose a color
    if (card.type === 'wild' || card.type === 'wild4') {
      color = this.chooseColor(bot.cards, topCard);
    }

    return { action: 'play', data: { card, color } };
  }

  /**
   * Hard AI strategy - smart play with opponent consideration
   * @param {Array} playableCards - Cards that can be played
   * @param {Object} bot - The AI bot player
   * @param {Object} game - The game instance
   * @param {Object} topCard - The top card of discard pile
   * @returns {Object} Move object
   */
  hardStrategy(playableCards, bot, game, topCard) {
    if (playableCards.length === 0) {
      return { action: 'draw', data: null };
    }

    // Filter out cards that would help opponents
    const safeCards = playableCards.filter(card => {
      return !this.wouldHelpOpponent(card, bot, game);
    });

    const useCard = safeCards.length > 0 ? safeCards : playableCards;

    // Sort by priority
    const priorityCards = [...useCard].sort((a, b) => {
      const aPriority = this.getCardPriority(a, game);
      const bPriority = this.getCardPriority(b, game);
      return bPriority - aPriority;
    });

    const card = priorityCards[0];
    let color = null;

    // If it's a wild card, choose the best color
    if (card.type === 'wild' || card.type === 'wild4') {
      color = this.chooseBestColor(bot.cards, topCard, game);
    }

    return { action: 'play', data: { card, color } };
  }

  /**
   * Get card priority for AI decision making
   * @param {Object} card - The card to evaluate
   * @param {Object} game - The game instance
   * @returns {number} Priority score (higher is better)
   */
  getCardPriority(card, game) {
    let priority = 0;

    // Special cards have higher priority
    if (card.type === 'wild4') priority += 100;
    if (card.type === 'wild') priority += 80;
    if (card.type === 'draw2') priority += 60;
    if (card.type === 'skip') priority += 40;
    if (card.type === 'reverse') priority += 30;

    // Same color as most cards in hand gets bonus
    if (card.color) {
      const colorCount = game.players
        .map(p => p.cards || [])
        .flat()
        .filter(c => c.color === card.color).length;
      priority += colorCount * 2;
    }

    // Same value as most cards gets bonus
    if (card.value && !isNaN(card.value)) {
      const valueCount = game.players
        .map(p => p.cards || [])
        .flat()
        .filter(c => c.value === card.value).length;
      priority += valueCount;
    }

    return priority;
  }

  /**
   * Check if playing a card would help opponents
   * @param {Object} card - The card to check
   * @param {Object} bot - The AI bot player
   * @param {Object} game - The game instance
   * @returns {boolean} True if the card would help opponents
   */
  wouldHelpOpponent(card, bot, game) {
    // Skip cards that let next player play
    if (card.type === 'skip') {
      const nextPlayerIndex = this.getNextPlayerIndex(game);
      const nextPlayer = game.players[nextPlayerIndex];
      // If next player has many cards of the same color, skip might not be good
      if (nextPlayer && nextPlayer.cards) {
        const sameColorCount = nextPlayer.cards.filter(c => c.color === card.color).length;
        return sameColorCount >= 3;
      }
    }

    // Draw2 cards are usually good, but not if opponent has many draw cards
    if (card.type === 'draw2') {
      const nextPlayerIndex = this.getNextPlayerIndex(game);
      const nextPlayer = game.players[nextPlayerIndex];
      if (nextPlayer && nextPlayer.cards) {
        const drawCards = nextPlayer.cards.filter(c => c.type === 'draw2' || c.type === 'wild4');
        return drawCards.length >= 2;
      }
    }

    return false;
  }

  /**
   * Get the index of the next player
   * @param {Object} game - The game instance
   * @returns {number} Next player index
   */
  getNextPlayerIndex(game) {
    const currentIndex = game.currentPlayer;
    const totalPlayers = game.players.length + game.bots.length;
    const nextIndex = (currentIndex + game.direction) % totalPlayers;
    return nextIndex >= 0 ? nextIndex : totalPlayers + nextIndex;
  }

  /**
   * Get cards that can be played
   * @param {Array} cards - Player's cards
   * @param {Object} topCard - Top card of discard pile
   * @param {Object} game - The game instance
   * @returns {Array} Playable cards
   */
  getPlayableCards(cards, topCard, game) {
    if (!topCard) return [];

    return cards.filter(card => {
      // Wild cards can always be played
      if (card.type === 'wild' || card.type === 'wild4') {
        return true;
      }

      // Matching color
      if (card.color === topCard.color) {
        return true;
      }

      // Matching value or type
      if (card.value === topCard.value || card.type === topCard.type) {
        return true;
      }

      return false;
    });
  }

  /**
   * Choose a color for wild card (simple strategy)
   * @param {Array} cards - Player's cards
   * @param {Object} topCard - Top card of discard pile
   * @returns {string} Chosen color
   */
  chooseColor(cards, topCard) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    
    // Count cards of each color in hand
    const colorCounts = {};
    colors.forEach(color => {
      colorCounts[color] = cards.filter(c => c.color === color).length;
    });

    // Choose color with most cards
    let maxColor = 'red';
    let maxCount = 0;
    
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxColor = color;
      }
    }

    return maxColor;
  }

  /**
   * Choose the best color for wild card (smart strategy)
   * @param {Array} cards - Player's cards
   * @param {Object} topCard - Top card of discard pile
   * @param {Object} game - The game instance
   * @returns {string} Best color to choose
   */
  chooseBestColor(cards, topCard, game) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    
    // Count cards of each color in hand
    const colorCounts = {};
    colors.forEach(color => {
      colorCounts[color] = cards.filter(c => c.color === color).length;
    });

    // Also consider what colors opponents might have
    const opponentColors = {};
    colors.forEach(color => {
      opponentColors[color] = 0;
    });

    // Count opponent cards by color (from visible information)
    game.players.forEach(player => {
      if (player.cards) {
        player.cards.forEach(card => {
          if (card.color && opponentColors[card.color] !== undefined) {
            opponentColors[card.color]++;
          }
        });
      }
    });

    // Choose color that we have most of, but opponents have least of
    let bestColor = 'red';
    let bestScore = -Infinity;

    for (const color of colors) {
      const score = (colorCounts[color] * 2) - opponentColors[color];
      if (score > bestScore) {
        bestScore = score;
        bestColor = color;
      }
    }

    return bestColor;
  }

  /**
   * Say UNO when bot has one card left
   * @param {Object} bot - The AI bot player
   * @returns {boolean} True if bot should say UNO
   */
  shouldSayUno(bot) {
    return bot.cards.length === 1 && !bot.saidUno;
  }

  /**
   * Delay function for AI thinking
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get bot display name
   * @param {Object} bot - The AI bot player
   * @returns {string} Display name with avatar
   */
  getDisplayName(bot) {
    return `${bot.avatar} ${bot.name}`;
  }

  /**
   * Create multiple AI bots for a game
   * @param {string} gameId - The game ID
   * @param {number} count - Number of bots to create
   * @param {string} difficulty - Difficulty level for all bots (easy, medium, hard)
   * @returns {Array} Array of AI bot objects
   */
  createBots(gameId, count, difficulty = 'medium') {
    const bots = [];
    for (let i = 0; i < count; i++) {
      bots.push(this.createBot(gameId, i, difficulty));
    }
    return bots;
  }
}

module.exports = new UNOBot();
