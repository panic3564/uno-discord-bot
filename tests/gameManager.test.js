const test = require('node:test');
const assert = require('node:assert/strict');
const gameManager = require('../src/utils/gameManager');

function makeGame() {
  const guildId = `guild-${Math.random().toString(36).slice(2, 10)}`;
  const game = gameManager.createGame(guildId, {
    channelId: 'channel-1',
    createdBy: 'user-1',
  });
  gameManager.addPlayer(game.id, 'user-1', 'Player One');
  return game;
}

function makeStartedGame(totalPlayers = 3) {
  const game = makeGame();
  for (let i = 2; i <= totalPlayers; i += 1) {
    gameManager.addPlayer(game.id, `user-${i}`, `Player ${i}`);
  }
  assert.ok(gameManager.startGame(game.id));
  return game;
}

test('addPlayer stores players as objects keyed by user id', () => {
  const game = makeGame();
  assert.equal(gameManager.addPlayer(game.id, 'user-2', 'Player Two'), true);
  assert.equal(game.players.length, 2);
  assert.ok(game.players.some(p => p.id === 'user-2'));

  // The same user cannot join twice
  assert.equal(gameManager.addPlayer(game.id, 'user-2', 'Player Two'), false);
});

test('removePlayer matches players by user id', () => {
  const game = makeGame();
  assert.equal(gameManager.removePlayer(game.id, 'user-1'), true);
  assert.equal(game.players.length, 0);
  assert.equal(gameManager.removePlayer(game.id, 'user-1'), false);
});

test('validateGameSetup requires two players including one human', () => {
  const game = makeGame();
  assert.equal(gameManager.validateGameSetup(game.id).isValid, false);

  gameManager.addBots(game.id, 1);
  assert.equal(gameManager.validateGameSetup(game.id).isValid, true);
});

test('startGame deals seven cards per player and a non-wild first card', () => {
  const game = makeStartedGame(3);
  assert.equal(game.status, 'playing');

  for (const player of gameManager.getAllPlayers(game.id)) {
    assert.equal(player.cards.length, 7);
  }
  assert.equal(game.deck.length, 108 - 21 - 1);
  assert.equal(game.discardPile.length, 1);
  assert.notEqual(game.discardPile[0].type, 'wild');
  assert.notEqual(game.discardPile[0].type, 'wild4');
});

test('moveToNextPlayer wraps around in both directions', () => {
  const game = makeStartedGame(3);
  gameManager.moveToNextPlayer(game);
  assert.equal(game.currentPlayer, 1);
  gameManager.moveToNextPlayer(game);
  assert.equal(game.currentPlayer, 2);
  gameManager.moveToNextPlayer(game);
  assert.equal(game.currentPlayer, 0);

  game.direction = -1;
  gameManager.moveToNextPlayer(game);
  assert.equal(game.currentPlayer, 2);
});

test('applyCardEffectsAndAdvance advances one player for a number card', () => {
  const game = makeStartedGame(3);
  gameManager.applyCardEffectsAndAdvance(game, { type: 'number' });
  assert.equal(game.currentPlayer, 1);
});

test('applyCardEffectsAndAdvance skips one player for a skip card', () => {
  const game = makeStartedGame(3);
  gameManager.applyCardEffectsAndAdvance(game, { type: 'skip' });
  assert.equal(game.currentPlayer, 2);
});

test('applyCardEffectsAndAdvance flips direction for a reverse card', () => {
  const game = makeStartedGame(3);
  gameManager.applyCardEffectsAndAdvance(game, { type: 'reverse' });
  assert.equal(game.direction, -1);
  assert.equal(game.currentPlayer, 2);
});

test('reverse acts as a skip in a two-player game', () => {
  const game = makeStartedGame(2);
  gameManager.applyCardEffectsAndAdvance(game, { type: 'reverse' });
  assert.equal(game.direction, -1);
  // The same player plays again
  assert.equal(game.currentPlayer, 0);
});

test('draw2 makes the next player draw two cards and lose their turn', () => {
  const game = makeStartedGame(3);
  gameManager.applyCardEffectsAndAdvance(game, { type: 'draw2' });
  const victim = gameManager.getAllPlayers(game.id)[1];
  assert.equal(victim.cards.length, 9);
  assert.equal(game.currentPlayer, 2);
});

test('wild4 makes the next player draw four cards and lose their turn', () => {
  const game = makeStartedGame(3);
  gameManager.applyCardEffectsAndAdvance(game, { type: 'wild4' });
  const victim = gameManager.getAllPlayers(game.id)[1];
  assert.equal(victim.cards.length, 11);
  assert.equal(game.currentPlayer, 2);
});
