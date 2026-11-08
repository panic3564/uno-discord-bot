const test = require('node:test');
const assert = require('node:assert/strict');
const gameManager = require('../src/utils/gameManager');

test('cancelWaitingGame removes the game and clears the pending entry', async () => {
  const guildId = 'guild-cancel-' + Math.random().toString(36).slice(2, 10);
  const game = gameManager.createGame(guildId, {
    channelId: 'channel-1',
    createdBy: 'user-1',
  });
  gameManager.addPlayer(game.id, 'user-1', 'Player One');

  assert.equal(await gameManager.cancelWaitingGame(game.id, null, 'test cancel'), true);
  assert.equal(gameManager.getGame(game.id), null);
  assert.notEqual(gameManager.pendingGames.get(guildId), game.id);
  assert.equal(gameManager.getGamesByGuild(guildId).some(g => g.id === game.id), false);

  // A game that no longer exists cannot be cancelled again
  assert.equal(await gameManager.cancelWaitingGame(game.id, null, 'again'), false);
});

test('cancelWaitingGame refuses games that already started', async () => {
  const guildId = 'guild-cancel-started-' + Math.random().toString(36).slice(2, 10);
  const game = gameManager.createGame(guildId, {
    channelId: 'channel-1',
    createdBy: 'user-1',
  });
  gameManager.addPlayer(game.id, 'user-1', 'Player One');
  gameManager.addBots(game.id, 1);
  assert.ok(gameManager.startGame(game.id));

  assert.equal(await gameManager.cancelWaitingGame(game.id, null, 'too late'), false);
  // The running game is untouched
  assert.ok(gameManager.getGame(game.id));
});
