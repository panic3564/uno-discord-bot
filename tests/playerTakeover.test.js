const test = require('node:test');
const assert = require('node:assert/strict');
const gameManager = require('../src/utils/gameManager');

function makeStartedGame(withTeams) {
  const suffix = Math.random().toString(36).slice(2, 10);
  const game = gameManager.createGame('guild-takeover-' + suffix, {
    channelId: 'channel-1',
    createdBy: 'user-1',
    withTeams: !!withTeams,
  });
  const playerCount = withTeams ? 4 : 3;
  for (let i = 1; i <= playerCount; i++) {
    gameManager.addPlayer(game.id, 'user-' + i, 'Player ' + i);
  }
  assert.ok(gameManager.startGame(game.id));
  return game;
}

test('convertPlayerToBot replaces the player in place with an AI holding their hand', () => {
  const game = makeStartedGame(false);
  const handSizeBefore = game.players[1].cards.length;
  const combinedBefore = game.players.length + game.bots.length;

  const bot = gameManager.convertPlayerToBot(game.id, 'user-2');

  assert.ok(bot, 'the player should have been converted');
  assert.equal(bot.type, 'ai');
  assert.equal(bot.cards.length, handSizeBefore);
  assert.equal(bot.saidUno, false);
  // The bot sits at the same position in the combined turn order
  const allPlayers = gameManager.getAllPlayers(game.id);
  assert.equal(allPlayers.length, combinedBefore);
  assert.equal(allPlayers[1].id, bot.id);
  // The user is no longer a participant
  assert.equal(game.players.some(p => p.id === 'user-2'), false);
});

test('convertPlayerToBot keeps team membership in team mode', () => {
  const game = makeStartedGame(true);
  assert.equal(gameManager.getPlayerTeam(game.id, 'user-2'), 'B');

  const bot = gameManager.convertPlayerToBot(game.id, 'user-2');

  assert.ok(bot);
  assert.equal(gameManager.getPlayerTeam(game.id, bot.id), 'B');
});

test('convertPlayerToBot refuses unknown users and waiting games', () => {
  const game = makeStartedGame(false);

  assert.equal(gameManager.convertPlayerToBot(game.id, 'user-99'), null);

  const suffix = Math.random().toString(36).slice(2, 10);
  const waiting = gameManager.createGame('guild-takeover-wait-' + suffix, {
    channelId: 'channel-2',
    createdBy: 'user-1',
  });
  gameManager.addPlayer(waiting.id, 'user-1', 'Player One');
  assert.equal(gameManager.convertPlayerToBot(waiting.id, 'user-1'), null);
});
