const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const stats = require('../src/utils/stats');

test('recordCardPlayed counts cards and wilds separately', () => {
  stats.recordCardPlayed('stats-user-1', { type: 'number' });
  stats.recordCardPlayed('stats-user-1', { type: 'wild' });
  const record = stats.getUserStats('stats-user-1');
  assert.equal(record.cardsPlayed, 2);
  assert.equal(record.wildsPlayed, 1);
});

test('recordPenalty tracks draw2 and wild4 bad luck and drawn cards', () => {
  const human = { id: 'stats-user-2', type: 'human' };
  stats.recordPenalty(human, 'draw2', 2);
  stats.recordPenalty(human, 'wild4', 4);
  const record = stats.getUserStats('stats-user-2');
  assert.equal(record.plus2Received, 1);
  assert.equal(record.plus4Received, 1);
  assert.equal(record.cardsDrawn, 6);
});

test('recordPenalty ignores AI players', () => {
  stats.recordPenalty({ id: 'stats-bot-1', type: 'ai' }, 'wild4', 4);
  assert.equal(stats.getUserStats('stats-bot-1'), null);
});

test('recordGameFinished counts games, wins, team games and fastest win', () => {
  const game = {
    players: [
      { id: 'stats-user-3', type: 'human' },
      { id: 'stats-user-4', type: 'human' },
    ],
    options: { withTeams: true },
    winner: { id: 'stats-user-3' },
    startedAt: new Date('2026-01-01T10:00:00Z'),
    endedAt: new Date('2026-01-01T10:05:00Z'),
  };
  stats.recordGameFinished(game);

  const winner = stats.getUserStats('stats-user-3');
  const loser = stats.getUserStats('stats-user-4');
  assert.equal(winner.gamesPlayed, 1);
  assert.equal(winner.gamesWon, 1);
  assert.equal(winner.teamGamesPlayed, 1);
  assert.equal(winner.teamGamesWon, 1);
  assert.equal(winner.fastestWinMs, 300000);
  assert.equal(loser.gamesPlayed, 1);
  assert.equal(loser.gamesWon, 0);
  assert.equal(loser.teamGamesPlayed, 1);
  assert.equal(loser.teamGamesWon, 0);
  assert.equal(loser.fastestWinMs, null);
});

test('fastest win keeps the minimum duration across games', () => {
  const base = {
    players: [{ id: 'stats-user-5', type: 'human' }],
    winner: { id: 'stats-user-5' },
  };
  stats.recordGameFinished({ ...base, startedAt: new Date(0), endedAt: new Date(500000) });
  stats.recordGameFinished({ ...base, startedAt: new Date(0), endedAt: new Date(200000) });
  assert.equal(stats.getUserStats('stats-user-5').fastestWinMs, 200000);
});

test('recordCallout credits the caller and penalizes the called player', () => {
  const called = { id: 'stats-user-7', type: 'human' };
  stats.recordCallout('stats-user-6', called, 2);
  assert.equal(stats.getUserStats('stats-user-6').calloutsMade, 1);

  const caught = stats.getUserStats('stats-user-7');
  assert.equal(caught.calledOutCount, 1);
  assert.equal(caught.cardsDrawn, 2);
});

test('recordSkip, recordCardsDrawn and recordUnoCall update counters', () => {
  stats.recordSkip('stats-user-8');
  stats.recordCardsDrawn('stats-user-8', 3);
  stats.recordUnoCall('stats-user-8');
  const record = stats.getUserStats('stats-user-8');
  assert.equal(record.skipsReceived, 1);
  assert.equal(record.cardsDrawn, 3);
  assert.equal(record.unoCalls, 1);
});

test('saveStats writes the record to the configured file', () => {
  const file = path.join(os.tmpdir(), 'stats-test-' + process.pid + '.json');
  const previous = process.env.STATS_FILE;
  process.env.STATS_FILE = file;
  try {
    stats.recordCardPlayed('stats-user-9', { type: 'number' });
    stats.saveStats();
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(saved.stats.some(entry => entry[0] === 'stats-user-9'));
  } finally {
    if (previous === undefined) {
      delete process.env.STATS_FILE;
    } else {
      process.env.STATS_FILE = previous;
    }
    fs.rmSync(file, { force: true });
  }
});
