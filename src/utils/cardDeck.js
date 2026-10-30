/**
 * UNO Card Deck Utilities
 * Handles card creation, validation, and deck operations
 */

class CardDeck {
  constructor() {
    this.colors = ['red', 'blue', 'green', 'yellow'];
    this.values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    this.specialTypes = ['wild', 'wild4'];
  }

  /**
   * Create a standard UNO deck
   * @returns {Array} Array of card objects
   */
  createDeck() {
    const deck = [];

    // Create regular colored cards
    for (const color of this.colors) {
      for (const value of this.values) {
        // 0 cards have only 1 copy, others have 2
        const count = value === '0' ? 1 : 2;
        for (let i = 0; i < count; i++) {
          deck.push(this.createCard(color, value));
        }
      }
    }

    // Create wild cards (4 of each type)
    for (const type of this.specialTypes) {
      for (let i = 0; i < 4; i++) {
        deck.push(this.createCard(null, null, type));
      }
    }

    return deck;
  }

  /**
   * Create a single card
   * @param {string|null} color - Card color (null for wild cards)
   * @param {string|null} value - Card value (null for wild cards)
   * @param {string} type - Card type (number, skip, reverse, draw2, wild, wild4)
   * @returns {Object} Card object
   */
  createCard(color, value, type = 'number') {
    return {
      id: `${color || 'wild'}-${value || type}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      color,
      value,
      type,
      playable: true,
    };
  }

  /**
   * Shuffle a deck
   * @param {Array} deck - The deck to shuffle
   * @returns {Array} The shuffled deck
   */
  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Draw a card from the deck
   * @param {Array} deck - The deck to draw from
   * @param {Array} discardPile - The discard pile
   * @returns {Object} The drawn card
   */
  drawCard(deck, discardPile) {
    // If deck is empty, reshuffle discard pile (except top card)
    if (deck.length === 0) {
      if (discardPile.length > 1) {
        // Keep the top card of the discard pile
        const topCard = discardPile.pop();
        // Reshuffle the rest and add to deck
        const reshuffled = this.shuffleDeck(discardPile);
        deck.push(...reshuffled);
        discardPile.push(topCard);
      } else {
        // Can't draw, no cards left
        return null;
      }
    }

    return deck.pop();
  }

  /**
   * Check if a card can be played on another card
   * @param {Object} card - The card to play
   * @param {Object} topCard - The top card of the discard pile
   * @returns {boolean} True if the card can be played
   */
  canPlayCard(card, topCard) {
    // Wild cards can always be played
    if (card.type === 'wild' || card.type === 'wild4') {
      return true;
    }

    // Matching color
    if (card.color === topCard.color) {
      return true;
    }

    // Matching value/type
    if (card.value === topCard.value || card.type === topCard.type) {
      return true;
    }

    return false;
  }

  /**
   * Get the display name for a card
   * @param {Object} card - The card object
   * @returns {string} The display name
   */
  getCardDisplayName(card) {
    if (card.type === 'wild') {
      return 'Wild';
    }
    if (card.type === 'wild4') {
      return 'Wild Draw 4';
    }
    if (card.type === 'skip') {
      return `${this.capitalize(card.color)} Skip`;
    }
    if (card.type === 'reverse') {
      return `${this.capitalize(card.color)} Reverse`;
    }
    if (card.type === 'draw2') {
      return `${this.capitalize(card.color)} Draw 2`;
    }
    return `${this.capitalize(card.color)} ${card.value}`;
  }

  /**
   * Capitalize the first letter of a string
   * @param {string} str - The string to capitalize
   * @returns {string} The capitalized string
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get card emoji representation
   * @param {Object} card - The card object
   * @returns {string} The emoji representation
   */
  getCardEmoji(card) {
    const colorEmojis = {
      red: '🔴',
      blue: '🔵',
      green: '🟢',
      yellow: '🟡',
    };

    const valueEmojis = {
      '0': '0️⃣',
      '1': '1️⃣',
      '2': '2️⃣',
      '3': '3️⃣',
      '4': '4️⃣',
      '5': '5️⃣',
      '6': '6️⃣',
      '7': '7️⃣',
      '8': '8️⃣',
      '9': '9️⃣',
      skip: '➡️',
      reverse: '🔄',
      draw2: '🃏',
      wild: '🌈',
      wild4: '🌈➕4',
    };

    if (card.type === 'wild' || card.type === 'wild4') {
      return valueEmojis[card.type] || '🃏';
    }

    return (colorEmojis[card.color] || '') + (valueEmojis[card.value] || card.value);
  }
}

module.exports = new CardDeck();
