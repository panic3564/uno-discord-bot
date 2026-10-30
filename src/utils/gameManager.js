/**
 * Game Manager for UNO Discord Bot
 * Manages active UNO games and their state
 */

class GameManager {
  constructor() {
    this.games = new Map(); // Map of guildId -> Game instances
    this.pendingGames = new Map(); // Map of guildId -> pending game setup
  }

  /**
   * Create a new UNO game
   * @param {string} guildId - The guild ID where the game is being created
   * @param {Object} options - Game options
   * @param {number} options.players - Number of players
   * @param {boolean} options.withBots - Whether to include AI bots
   * @returns {Object} The created game instance
   */
  createGame(guildId, options) {
    const game = {
      id: `${guildId}-${Date.now()}`,
      guildId,
      players: [],
      bots: [],
      deck: [],
      discardPile: [],
      currentPlayer: 0,
      direction: 1, // 1 for clockwise, -1 for counter-clockwise
      status: 'waiting', // waiting, playing, finished
      options,
      createdAt: new Date(),
      lastAction: new Date(),
    };

    this.games.set(game.id, game);
    this.pendingGames.set(guildId, game.id);

    return game;
  }

  /**
   * Get a game by ID
   * @param {string} gameId - The game ID
   * @returns {Object|null} The game instance or null if not found
   */
  getGame(gameId) {
    return this.games.get(gameId) || null;
  }

  /**
   * Get a game by guild ID
   * @param {string} guildId - The guild ID
   * @returns {Object|null} The game instance or null if not found
   */
  getGameByGuild(guildId) {
    const gameId = this.pendingGames.get(guildId);
    if (gameId) {
      return this.games.get(gameId) || null;
    }
    
    // Check all games for this guild
    for (const [id, game] of this.games) {
      if (game.guildId === guildId && game.status === 'playing') {
        return game;
      }
    }
    
    return null;
  }

  /**
   * Add a player to a game
   * @param {string} gameId - The game ID
   * @param {string} userId - The user ID to add
   * @returns {boolean} True if player was added, false otherwise
   */
  addPlayer(gameId, userId) {
    const game = this.getGame(gameId);
    if (!game || game.status !== 'waiting') return false;

    if (game.players.length >= game.options.players) return false;
    if (game.players.includes(userId)) return false;

    game.players.push(userId);
    return true;
  }

  /**
   * Remove a player from a game
   * @param {string} gameId - The game ID
   * @param {string} userId - The user ID to remove
   * @returns {boolean} True if player was removed, false otherwise
   */
  removePlayer(gameId, userId) {
    const game = this.getGame(gameId);
    if (!game) return false;

    const index = game.players.indexOf(userId);
    if (index === -1) return false;

    game.players.splice(index, 1);
    return true;
  }

  /**
   * Start a game
   * @param {string} gameId - The game ID
   * @returns {boolean} True if game was started, false otherwise
   */
  startGame(gameId) {
    const game = this.getGame(gameId);
    if (!game || game.status !== 'waiting') return false;

    // TODO: Initialize deck, deal cards, etc.
    game.status = 'playing';
    game.lastAction = new Date();

    // Initialize deck
    this.initializeDeck(game);

    // Deal initial cards
    this.dealInitialCards(game);

    // Set first card
    this.setFirstCard(game);

    return true;
  }

  /**
   * Initialize the deck for a game
   * @param {Object} game - The game instance
   */
  initializeDeck(game) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    const special = ['wild', 'wild4'];

    // Create regular cards
    for (const color of colors) {
      for (const value of values) {
        // Add two of each card (except 0 which has one)
        const count = value === '0' ? 1 : 2;
        for (let i = 0; i < count; i++) {
          game.deck.push({ color, value, type: 'number' });
        }
      }
    }

    // Create special cards
    for (const type of special) {
      for (let i = 0; i < 4; i++) {
        game.deck.push({ color: null, value: null, type });
      }
    }

    // Shuffle the deck
    this.shuffleDeck(game);
  }

  /**
   * Shuffle the deck
   * @param {Object} game - The game instance
   */
  shuffleDeck(game) {
    for (let i = game.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [game.deck[i], game.deck[j]] = [game.deck[j], game.deck[i]];
    }
  }

  /**
   * Deal initial cards to players
   * @param {Object} game - The game instance
   */
  dealInitialCards(game) {
    const cardsPerPlayer = 7;
    
    for (const playerId of game.players) {
      const playerCards = [];
      for (let i = 0; i < cardsPerPlayer; i++) {
        if (game.deck.length > 0) {
          const card = game.deck.pop();
          playerCards.push(card);
        }
      }
      // In a real implementation, you'd store this in a player object
    }
  }

  /**
   * Set the first card in the discard pile
   * @param {Object} game - The game instance
   */
  setFirstCard(game) {
    if (game.deck.length > 0) {
      const card = game.deck.pop();
      // Make sure it's not a wild card
      if (card.type === 'wild' || card.type === 'wild4') {
        // Put it back and draw another
        game.deck.push(card);
        this.shuffleDeck(game);
        return this.setFirstCard(game);
      }
      game.discardPile.push(card);
    }
  }

  /**
   * End a game
   * @param {string} gameId - The game ID
   * @returns {boolean} True if game was ended, false otherwise
   */
  endGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;

    game.status = 'finished';
    game.endedAt = new Date();

    // Clean up after some time
    setTimeout(() => {
      this.games.delete(gameId);
      this.pendingGames.delete(game.guildId);
    }, 3600000); // 1 hour

    return true;
  }

  /**
   * Get all active games
   * @returns {Array} Array of all active games
   */
  getAllGames() {
    return Array.from(this.games.values());
  }

  /**
   * Get all pending games
   * @returns {Array} Array of all pending game IDs
   */
  getAllPendingGames() {
    return Array.from(this.pendingGames.values());
  }
}

module.exports = new GameManager();
