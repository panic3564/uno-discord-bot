const test = require('node:test');
const assert = require('node:assert/strict');
const cardDeck = require('../src/utils/cardDeck');

test('createDeck produces a standard 108-card UNO deck', () => {
  const deck = cardDeck.createDeck();
  assert.equal(deck.length, 108);

  const colors = ['red', 'blue', 'green', 'yellow'];
  for (const color of colors) {
    const colorCards = deck.filter(c => c.color === color);
    // One 0, two each of 1-9, skip, reverse and draw2
    assert.equal(colorCards.length, 25);
    assert.equal(colorCards.filter(c => c.value === '0').length, 1);
    for (const value of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2']) {
      assert.equal(colorCards.filter(c => c.value === value).length, 2);
    }
  }

  assert.equal(deck.filter(c => c.type === 'wild').length, 4);
  assert.equal(deck.filter(c => c.type === 'wild4').length, 4);
});

test('every card in the deck has a unique id', () => {
  const deck = cardDeck.createDeck();
  const ids = new Set(deck.map(c => c.id));
  assert.equal(ids.size, deck.length);
});

test('createCard derives the correct type from the card value', () => {
  assert.equal(cardDeck.createCard('red', '5').type, 'number');
  assert.equal(cardDeck.createCard('red', 'skip').type, 'skip');
  assert.equal(cardDeck.createCard('red', 'reverse').type, 'reverse');
  assert.equal(cardDeck.createCard('red', 'draw2').type, 'draw2');
  assert.equal(cardDeck.createCard(null, null, 'wild').type, 'wild');
  assert.equal(cardDeck.createCard(null, null, 'wild4').type, 'wild4');
});

test('canPlayCard matches on color, value and special type', () => {
  const numberCard = { color: 'red', value: '5', type: 'number' };

  assert.ok(cardDeck.canPlayCard({ color: 'red', value: '9', type: 'number' }, numberCard));
  assert.ok(cardDeck.canPlayCard({ color: 'blue', value: '5', type: 'number' }, numberCard));
  assert.equal(cardDeck.canPlayCard({ color: 'blue', value: '9', type: 'number' }, numberCard), false);
  assert.ok(cardDeck.canPlayCard({ color: null, value: null, type: 'wild' }, numberCard));

  const skipCard = { color: 'red', value: 'skip', type: 'skip' };
  assert.ok(cardDeck.canPlayCard({ color: 'green', value: 'skip', type: 'skip' }, skipCard));
  assert.ok(cardDeck.canPlayCard({ color: 'red', value: '3', type: 'number' }, skipCard));
});

test('drawCard reshuffles the discard pile without duplicating or losing cards', () => {
  const deck = cardDeck.createDeck();
  const discardPile = [];
  // Empty the deck into the discard pile
  while (deck.length > 0) discardPile.push(deck.pop());

  const drawn = cardDeck.drawCard(deck, discardPile);
  assert.ok(drawn);

  // Only the top card remains on the discard pile
  assert.equal(discardPile.length, 1);
  assert.ok(!discardPile.some(c => c.id === drawn.id));

  // No card was duplicated or lost
  assert.equal(deck.length + discardPile.length + 1, 108);
  const ids = [...deck, ...discardPile, drawn].map(c => c.id);
  assert.equal(new Set(ids).size, 108);
});

test('drawCard resets wild card colors when recycling the discard pile', () => {
  const wild = { id: 'wild-1', color: 'red', value: null, type: 'wild' };
  const topCard = { id: 'top-1', color: 'blue', value: '5', type: 'number' };

  const drawn = cardDeck.drawCard([], [wild, topCard]);
  assert.equal(drawn.id, 'wild-1');
  assert.equal(drawn.color, null);
});
