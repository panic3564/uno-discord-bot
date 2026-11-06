const test = require('node:test');
const assert = require('node:assert/strict');
const unoBot = require('../src/utils/unoBot');

test('getNextPlayerIndex wraps around in both directions', () => {
  const game = {
    players: [{ id: 'human-1' }, { id: 'human-2' }],
    bots: [{ id: 'bot-1' }],
    currentPlayer: 2,
    direction: 1,
  };
  assert.equal(unoBot.getNextPlayerIndex(game), 0);

  game.direction = -1;
  game.currentPlayer = 0;
  // (0 - 1) mod 3 normalizes to index 2
  assert.equal(unoBot.getNextPlayerIndex(game), 2);
});

test('getNextPlayer indexes the combined players and bots list', () => {
  const game = {
    players: [{ id: 'human-1' }, { id: 'human-2' }],
    bots: [{ id: 'bot-1', type: 'ai' }],
    currentPlayer: 1,
    direction: 1,
  };
  // Index 2 in the combined list is the first bot, not a third human
  assert.equal(unoBot.getNextPlayer(game).id, 'bot-1');
});
