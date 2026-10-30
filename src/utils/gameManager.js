/**
 * Game Manager for UNO Discord Bot
 * Manages active UNO games and their state
 */

const unoBot = require('./unoBot');

class GameManager {
  constructor() {
    this.games = new Map(); // Map of gameId -> Game instances
    this.pendingGames = new Map(); // Map of guildId -> pending game setup
    this.maxPlayers = 4; // Maximum players per game (including AI)
  }

  /**
   * Create a new UNO game
   * @param {string} guildId - The guild ID where the game is being created
   * @param {Object} options - Game options
   * @param {number} options.players - Number of human players
   * @param {boolean} options.withBots - Whether to include AI bots
   * @param {number} options.botCount - Number of AI bots to add
   * @param {string} options.createdBy - User ID who created the game
   * @param {boolean} options.withTeams - Whether to use team mode
   * @returns {Object} The created game instance
   */
  createGame(guildId, options) {
    const game = {
      id: `${guildId}-${Date.now()}`,
      guildId,
      channelId: options.channelId || null,
      players: [],
      bots: [],
      deck: [],
      discardPile: [],
      currentPlayer: 0,
      direction: 1, // 1 for clockwise, -1 for counter-clockwise
      status: 'waiting', // waiting, playing, finished
      options: {
        maxPlayers: options.maxPlayers || this.maxPlayers,
        withBots: options.withBots || false,
        botCount: options.botCount || 0,
        withTeams: options.withTeams || false,
        ...options,
      },
      teams: [], // Team assignments for team mode
      createdBy: options.createdBy || null,
      createdAt: new Date(),
      lastAction: new Date(),
      turnTimeout: 30000, // 30 seconds per turn
    };

    // Add AI bots if requested
    if (game.options.withBots && game.options.botCount > 0) {
      const bots = unoBot.createBots(game.id, game.options.botCount);
      game.bots = bots;
    }

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
      if (game.guildId === guildId && game.status !== 'finished') {
        return game;
      }
    }
    
    return null;
  }

  /**
   * Get all games in a guild
   * @param {string} guildId - The guild ID
   * @returns {Array} Array of game instances
   */
  getGamesByGuild(guildId) {
    return Array.from(this.games.values())
      .filter(game => game.guildId === guildId && game.status !== 'finished');
  }

  /**
   * Get all active games
   * @returns {Array} Array of all game instances
   */
  getAllGames() {
    return Array.from(this.games.values())
      .filter(game => game.status !== 'finished');
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

    const totalPlayers = game.players.length + game.bots.length;
    const maxPlayers = game.options.maxPlayers || this.maxPlayers;
    
    if (totalPlayers >= maxPlayers) return false;
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
   * Add AI bots to a game
   * @param {string} gameId - The game ID
   * @param {number} count - Number of bots to add
   * @param {string} difficulty - Difficulty level for bots (easy, medium, hard)
   * @returns {Array} Array of added bot objects
   */
  addBots(gameId, count, difficulty = 'medium') {
    const game = this.getGame(gameId);
    if (!game || game.status !== 'waiting') return [];

    const totalPlayers = game.players.length + game.bots.length;
    const maxPlayers = game.options.maxPlayers || this.maxPlayers;
    const botsToAdd = Math.min(count, maxPlayers - totalPlayers);

    if (botsToAdd <= 0) return [];

    const newBots = unoBot.createBots(game.id, game.bots.length + botsToAdd, difficulty);
    game.bots.push(...newBots.slice(0, botsToAdd));
    game.options.withBots = true;
    game.options.botCount = game.bots.length;
    game.options.botDifficulty = difficulty;

    return newBots.slice(0, botsToAdd);
  }

  /**
   * Remove AI bots from a game
   * @param {string} gameId - The game ID
   * @param {number} count - Number of bots to remove
   * @returns {Array} Array of removed bot objects
   */
  removeBots(gameId, count) {
    const game = this.getGame(gameId);
    if (!game || game.status !== 'waiting') return [];

    const botsToRemove = Math.min(count, game.bots.length);
    if (botsToRemove <= 0) return [];

    const removedBots = game.bots.splice(-botsToRemove, botsToRemove);
    game.options.botCount = game.bots.length;

    if (game.bots.length === 0) {
      game.options.withBots = false;
    }

    return removedBots;
  }

  /**
   * Validate game setup before starting
   * @param {string} gameId - The game ID
   * @returns {Object} Validation result with isValid and message
   */
  validateGameSetup(gameId) {
    const game = this.getGame(gameId);
    if (!game) {
      return { isValid: false, message: 'Game not found' };
    }

    const totalPlayers = game.players.length + game.bots.length;
    if (totalPlayers < 2) {
      return { isValid: false, message: 'Need at least 2 players to start' };
    }

    if (totalPlayers > (game.options.maxPlayers || this.maxPlayers)) {
      return { isValid: false, message: `Maximum ${game.options.maxPlayers || this.maxPlayers} players allowed` };
    }

    if (game.players.length === 0) {
      return { isValid: false, message: 'Need at least 1 human player' };
    }

    // Validate team mode
    if (game.options.withTeams) {
      if (totalPlayers % 2 !== 0) {
        return { isValid: false, message: 'Team mode requires an even number of players' };
      }
      if (totalPlayers < 4) {
        return { isValid: false, message: 'Team mode requires at least 4 players' };
      }
    }

    return { isValid: true, message: 'Game setup is valid' };
  }

  /**
   * Assign teams to players
   * @param {string} gameId - The game ID
   * @returns {boolean} True if teams were assigned, false otherwise
   */
  assignTeams(gameId) {
    const game = this.getGame(gameId);
    if (!game || !game.options.withTeams) return false;

    const allPlayers = [...game.players, ...game.bots];
    const totalPlayers = allPlayers.length;

    // Clear existing teams
    game.teams = [];

    // Assign alternating teams: A, B, A, B, ...
    for (let i = 0; i < totalPlayers; i++) {
      const team = i % 2 === 0 ? 'A' : 'B';
      game.teams.push({
        playerId: allPlayers[i].id,
        team: team,
      });
    }

    return true;
  }

  /**
   * Get a player's team
   * @param {string} gameId - The game ID
   * @param {string} playerId - The player ID
   * @returns {string|null} Team name (A or B) or null if not in team mode
   */
  getPlayerTeam(gameId, playerId) {
    const game = this.getGame(gameId);
    if (!game || !game.options.withTeams || !game.teams) return null;

    const teamAssignment = game.teams.find(t => t.playerId === playerId);
    return teamAssignment ? teamAssignment.team : null;
  }

  /**
   * Check if two players are on the same team
   * @param {string} gameId - The game ID
   * @param {string} playerId1 - First player ID
   * @param {string} playerId2 - Second player ID
   * @returns {boolean} True if players are on the same team
   */
  arePlayersOnSameTeam(gameId, playerId1, playerId2) {
    const team1 = this.getPlayerTeam(gameId, playerId1);
    const team2 = this.getPlayerTeam(gameId, playerId2);
    return team1 !== null && team1 === team2;
  }

  /**
   * Get all players on the same team as a given player
   * @param {string} gameId - The game ID
   * @param {string} playerId - The player ID
   * @returns {Array} Array of player objects on the same team
   */
  getTeammates(gameId, playerId) {
    const game = this.getGame(gameId);
    if (!game || !game.options.withTeams || !game.teams) return [];

    const playerTeam = this.getPlayerTeam(gameId, playerId);
    if (!playerTeam) return [];

    const allPlayers = [...game.players, ...game.bots];
    const teammates = [];

    for (const teamAssignment of game.teams) {
      if (teamAssignment.team === playerTeam) {
        const player = allPlayers.find(p => p.id === teamAssignment.playerId);
        if (player && player.id !== playerId) {
          teammates.push(player);
        }
      }
    }

    return teammates;
  }

  /**
   * Get team information for display
   * @param {string} gameId - The game ID
   * @returns {Object} Team information with team A and team B players
   */
  getTeamInfo(gameId) {
    const game = this.getGame(gameId);
    if (!game || !game.options.withTeams || !game.teams) {
      return { teamA: [], teamB: [] };
    }

    const allPlayers = [...game.players, ...game.bots];
    const teamA = [];
    const teamB = [];

    for (const teamAssignment of game.teams) {
      const player = allPlayers.find(p => p.id === teamAssignment.playerId);
      if (player) {
        if (teamAssignment.team === 'A') {
          teamA.push(player);
        } else if (teamAssignment.team === 'B') {
          teamB.push(player);
        }
      }
    }

    return { teamA, teamB };
  }

  /**
   * Start a game
   * @param {string} gameId - The game ID
   * @returns {boolean} True if game was started, false otherwise
   */
  startGame(gameId) {
    const game = this.getGame(gameId);
    if (!game || game.status !== 'waiting') return false;

    const validation = this.validateGameSetup(gameId);
    if (!validation.isValid) {
      console.log(`Cannot start game: ${validation.message}`);
      return false;
    }

    game.status = 'playing';
    game.lastAction = new Date();

    // Assign teams if team mode is enabled
    if (game.options.withTeams) {
      this.assignTeams(gameId);
    }

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

    // Create special cards (4 of each type)
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
   * Deal initial cards to players and bots
   * @param {Object} game - The game instance
   */
  dealInitialCards(game) {
    const cardsPerPlayer = 7;
    const allPlayers = [...game.players, ...game.bots];
    
    for (const player of allPlayers) {
      const playerCards = [];
      for (let i = 0; i < cardsPerPlayer; i++) {
        if (game.deck.length > 0) {
          const card = game.deck.pop();
          playerCards.push(card);
        }
      }
      player.cards = playerCards;
      player.saidUno = false;
      player.wasCalledOut = false;
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
   * Process AI turn
   * @param {string} gameId - The game ID
   * @param {Object} client - Discord client for sending messages
   * @returns {Promise<Object>} The move made by the AI
   */
  async processAITurn(gameId, client) {
    const game = this.getGame(gameId);
    if (!game || game.status !== 'playing') return null;

    const currentPlayerIndex = game.currentPlayer;
    const allPlayers = [...game.players, ...game.bots];
    const currentPlayer = allPlayers[currentPlayerIndex];

    // If current player is not a bot, don't process
    if (!currentPlayer || currentPlayer.type !== 'ai') return null;

    // Get the bot's move
    const move = await unoBot.makeMove(game, currentPlayer, client);

    // Process the move
    if (move.action === 'play') {
      const { card, color } = move.data;
      
      // Remove card from bot's hand
      const cardIndex = currentPlayer.cards.findIndex(c => 
        c.id === card.id || (c.color === card.color && c.value === card.value && c.type === card.type)
      );
      
      if (cardIndex !== -1) {
        currentPlayer.cards.splice(cardIndex, 1);
      }

      // If it's a wild card, set the chosen color
      if (card.type === 'wild' || card.type === 'wild4') {
        card.color = color;
      }

      // Add card to discard pile
      game.discardPile.push(card);

      // Check if bot has one card left
      if (currentPlayer.cards.length === 1) {
        currentPlayer.saidUno = true;
      }

      // Check if bot won
      if (currentPlayer.cards.length === 0) {
        game.status = 'finished';
        game.winner = currentPlayer;
        return { action: 'win', data: { player: currentPlayer } };
      }

      // Move to next player
      this.moveToNextPlayer(game);

      return { action: 'play', data: { card, player: currentPlayer } };
    }

    if (move.action === 'draw') {
      // Draw a card
      const card = cardDeck.drawCard(game.deck, game.discardPile);
      if (card) {
        currentPlayer.cards.push(card);
      }

      // Move to next player (bot couldn't play)
      this.moveToNextPlayer(game);

      return { action: 'draw', data: { card, player: currentPlayer } };
    }

    return null;
  }

  /**
   * Move to the next player
   * @param {Object} game - The game instance
   */
  moveToNextPlayer(game) {
    const allPlayers = [...game.players, ...game.bots];
    game.currentPlayer = (game.currentPlayer + game.direction) % allPlayers.length;
    if (game.currentPlayer < 0) {
      game.currentPlayer += allPlayers.length;
    }
    game.lastAction = new Date();
  }

  /**
   * Get current player
   * @param {string} gameId - The game ID
   * @returns {Object|null} Current player object or null
   */
  getCurrentPlayer(gameId) {
    const game = this.getGame(gameId);
    if (!game) return null;

    const allPlayers = [...game.players, ...game.bots];
    return allPlayers[game.currentPlayer] || null;
  }

  /**
   * Get all players (human and AI)
   * @param {string} gameId - The game ID
   * @returns {Array} Array of all player objects
   */
  getAllPlayers(gameId) {
    const game = this.getGame(gameId);
    if (!game) return [];

    return [...game.players, ...game.bots];
  }

  /**
   * Get game state for display
   * @param {string} gameId - The game ID
   * @returns {Object} Game state for display
   */
  getGameState(gameId) {
    const game = this.getGame(gameId);
    if (!game) return null;

    const allPlayers = this.getAllPlayers(gameId);
    const currentPlayer = this.getCurrentPlayer(gameId);
    const topCard = game.discardPile[game.discardPile.length - 1];

    return {
      id: game.id,
      status: game.status,
      currentPlayer: currentPlayer ? {
        id: currentPlayer.id,
        name: currentPlayer.name || `Player ${game.players.indexOf(currentPlayer.id) + 1}`,
        type: currentPlayer.type || 'human',
        cardCount: currentPlayer.cards ? currentPlayer.cards.length : 0,
      } : null,
      players: allPlayers.map(p => ({
        id: p.id,
        name: p.name || `Player ${game.players.indexOf(p.id) + 1}`,
        type: p.type || 'human',
        cardCount: p.cards ? p.cards.length : 0,
        isBot: p.type === 'ai',
        avatar: p.avatar || null,
      })),
      topCard: topCard || null,
      direction: game.direction,
      createdAt: game.createdAt,
      lastAction: game.lastAction,
    };
  }
}

module.exports = new GameManager();
