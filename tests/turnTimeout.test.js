const test = require('node:test');
const assert = require('node:assert/strict');
const gameManager = require('../src/utils/gameManager');

function makeStartedGame() {
  const guildId = 'guild-timeout-' + Math.random().toString(36).slice(2, 10);
  const game = gameManager.createGame(guildId, {
    channelId: 'channel-1',
    createdBy: 'user-1',
  });
  gameManager.addPlayer(game.id, 'user-1', 'Player One');
  gameManager.addPlayer(game.id, 'user-2', 'Player Two');
  assert.ok(gameManager.startGame(game.id));
  return game;
}

test('enforceTurnTimeout skips an absent human and draws a card for them', () => {
  const game = makeStartedGame();
  game.turnTimeout = 0; // Expire immediately

  const result = gameManager.enforceTurnTimeout(game.id);
  assert.ok(result, 'the player should have been skipped');
  assert.equal(result.player.id, 'user-1');
  assert.equal(result.drewCard, true);
  // Seven initial cards plus the forced draw
  assert.equal(result.player.cards.length, 8);
  // The turn moved on to the second player
  assert.equal(gameManager.getCurrentPlayer(game.id).id, 'user-2');
});

test('enforceTurnTimeout leaves players inside the timeout alone', () => {
  const game = makeStartedGame();
  game.turnTimeout = 3600000; // One hour

  assert.equal(gameManager.enforceTurnTimeout(game.id), null);
  assert.equal(gameManager.getCurrentPlayer(game.id).id, 'user-1');
  assert.equal(gameManager.getCurrentPlayer(game.id).cards.length, 7);
});

test('enforceTurnTimeout ignores AI players and finished games', () => {
  const game = makeStartedGame();
  game.turnTimeout = 0; // Expire immediately
  game.bots.push({ id: 'bot-x', type: 'ai', cards: [], name: 'Bot X', avatar: '🤖' });
  game.currentPlayer = 2; // The bot we just added

  assert.equal(gameManager.enforceTurnTimeout(game.id), null);

  game.currentPlayer = 0; // Back to a human
  game.status = 'finished';
  assert.equal(gameManager.enforceTurnTimeout(game.id), null);
});
