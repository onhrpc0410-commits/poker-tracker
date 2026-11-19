function mk(n, step, limit) {
  var names = ['A', 'B', 'C', 'D', 'E'], ps = [], bal = {};
  for (var i = 0; i < n; i++) { ps.push({ id: names[i], name: names[i] }); bal[names[i]] = 0; }
  return Engine.newSession({ players: ps, balances: bal, step: step || 100, limit: limit || 1000 });
}
function sum(o) { var t = 0; for (var k in o) t += o[k]; return t; }

// ---- Task 2: session and hand start ----
test('startHand: first blind is seat 0, posts step, turn is seat 1', function () {
  var s = Engine.startHand(mk(3));
  assertEq(s.hand.blindIdx, 0);
  assertEq(s.hand.bets.A, 100);
  assertEq(Engine.balances(s).A, -100);
  assertEq(s.hand.currentBet, 100);
  assertEq(s.hand.turnIdx, 1);
  assertEq(s.hand.phase, 'betting');
});
test('startHand: blind rotates and wraps', function () {
  var s = mk(3), seen = [];
  for (var i = 0; i < 4; i++) { s = Engine.startHand(s); seen.push(s.hand.blindIdx); s.hand = null; }
  assertEq(seen, [0, 1, 2, 0]);
});
test('startHand: heads-up, non-blind acts first', function () {
  var s = Engine.startHand(mk(2));
  assertEq(s.hand.turnIdx, 1);
});
test('startHand throws while a hand is in progress', function () {
  var s = Engine.startHand(mk(3));
  assertThrows(function () { Engine.startHand(s); });
});
test('newSession rejects invalid input', function () {
  var ps = [{ id: 'A', name: 'A' }], b = { A: 0 };
  assertThrows(function () { Engine.newSession({ players: ps, balances: b, step: 100, limit: 1000 }); }, 'one player');
  var two = [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }], b2 = { A: 0, B: 0 };
  assertThrows(function () { Engine.newSession({ players: two, balances: b2, step: 0, limit: 1000 }); }, 'step 0');
  assertThrows(function () { Engine.newSession({ players: two, balances: b2, step: 100, limit: 50 }); }, 'limit<step');
  assertThrows(function () { Engine.newSession({ players: two, balances: b2, step: 1.5, limit: 50 }); }, 'step float');
});
test('balances: live total equals minus bets in hand', function () {
  var s = Engine.startHand(mk(3));
  assertEq(sum(Engine.balances(s)), -100);
});
test('newSession does not mutate its input', function () {
  var bal = { A: 5, B: 0 };
  var s = Engine.newSession({ players: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }], balances: bal, step: 100, limit: 1000 });
  s.balances.A = 99;
  assertEq(bal.A, 5);
});

// ---- Task 3: actions and round flow ----
function A(s, type, raiseTo) { return Engine.act(s, { type: type, raiseTo: raiseTo }); }
function hand3(step, limit) { return Engine.startHand(mk(3, step, limit)); }

test('round: call, raise, call, call reaches roundEnd with pot 900', function () {
  var s = hand3();
  s = A(s, 'call'); s = A(s, 'raise', 300); s = A(s, 'call'); s = A(s, 'call');
  assertEq(s.hand.phase, 'roundEnd');
  assertEq(sum(s.hand.bets), 900);
});
test('blind option: round stays open until blind checks', function () {
  var s = hand3();
  s = A(s, 'call'); s = A(s, 'call');
  assertEq(s.hand.phase, 'betting');
  var l = Engine.legal(s);
  assertEq(l.id, 'A'); assertEq(l.canCheck, true); assertEq(l.toCall, 0);
  s = A(s, 'check');
  assertEq(s.hand.phase, 'roundEnd');
});
test('check is illegal when there is something to call', function () {
  assertThrows(function () { A(hand3(), 'check'); });
});
test('call is illegal when toCall is 0', function () {
  var s = hand3(); s = A(s, 'call'); s = A(s, 'call');
  assertThrows(function () { A(s, 'call'); });
});
test('legal: toCall and raise bounds', function () {
  var l = Engine.legal(hand3());
  assertEq(l.id, 'B'); assertEq(l.toCall, 100); assertEq(l.canCheck, false);
  assertEq(l.minRaiseTo, 200); assertEq(l.maxRaiseTo, 1000);
});
test('raise must be currentBet + multiple of step and within bounds', function () {
  var s = hand3();
  assertThrows(function () { A(s, 'raise', 250); }, '250');
  assertThrows(function () { A(s, 'raise', 150); }, '150');
  assertThrows(function () { A(s, 'raise', 100); }, 'no raise');
  assertThrows(function () { A(s, 'raise', 1100); }, 'over limit');
  A(s, 'raise', 200);
});
test('act is illegal outside betting phase', function () {
  var s = hand3(); s = A(s, 'call'); s = A(s, 'call'); s = A(s, 'check');
  assertThrows(function () { A(s, 'call'); });
});
test('allin puts bets at limit and the player is skipped afterwards', function () {
  var s = hand3(100, 500);
  s = A(s, 'allin');
  assertEq(s.hand.bets.B, 500); assertEq(s.hand.allIn.B, true);
  assertEq(s.hand.currentBet, 500);
  s = A(s, 'call'); s = A(s, 'call');          // C then A
  assertEq(s.hand.phase, 'showdown');           // everyone matched, only B... all capped
});
test('everyone all in goes straight to showdown (no stall)', function () {
  var s = hand3(100, 300);
  s = A(s, 'allin'); s = A(s, 'allin'); s = A(s, 'allin');
  assertEq(s.hand.phase, 'showdown');
  assertEq(sum(s.hand.bets), 900);
});
test('one all in, one calls, one folds: showdown', function () {
  var s = hand3();
  s = A(s, 'allin'); s = A(s, 'call'); s = A(s, 'fold');
  assertEq(s.hand.phase, 'showdown');
  assertEq(s.hand.folded.A, true);
});
test('all but one fold: showdown immediately', function () {
  var s = hand3();
  s = A(s, 'fold'); s = A(s, 'fold');
  assertEq(s.hand.phase, 'showdown');
});
test('heads-up: non-blind acts first, blind has option', function () {
  var s = Engine.startHand(mk(2));
  assertEq(Engine.legal(s).id, 'B');
  s = A(s, 'call');
  assertEq(s.hand.phase, 'betting');
  assertEq(Engine.legal(s).id, 'A');
  s = A(s, 'check');
  assertEq(s.hand.phase, 'roundEnd');
});
test('nextRound resets bets, round 2 starts after the blind', function () {
  var s = hand3(); s = A(s, 'call'); s = A(s, 'call'); s = A(s, 'check');
  s = Engine.nextRound(s);
  assertEq(s.hand.round, 2); assertEq(s.hand.currentBet, 0);
  assertEq(Engine.legal(s).canCheck, true); assertEq(Engine.legal(s).id, 'B');
  assertEq(sum(s.hand.bets), 300);
});
test('nextRound skips folded players for first actor', function () {
  var s = hand3();
  s = A(s, 'fold'); s = A(s, 'call'); s = A(s, 'check');   // B folds, C calls, A checks
  s = Engine.nextRound(s);
  assertEq(Engine.legal(s).id, 'C');
});
test('nextRound throws unless roundEnd', function () {
  assertThrows(function () { Engine.nextRound(hand3()); });
});
test('toShowdown from roundEnd', function () {
  var s = hand3(); s = A(s, 'call'); s = A(s, 'call'); s = A(s, 'check');
  s = Engine.toShowdown(s);
  assertEq(s.hand.phase, 'showdown');
  assertThrows(function () { Engine.toShowdown(hand3()); });
});
test('bets never exceed the limit; calls are capped', function () {
  var s = hand3(100, 250);
  s = A(s, 'raise', 200); s = A(s, 'allin');    // B raises 200, C all in (250)
  assertEq(s.hand.bets.C, 250);
  assertEq(Engine.legal(s).toCall, 150);        // A: 250-100
  s = A(s, 'call');
  assertEq(s.hand.bets.A, 250); assertEq(s.hand.allIn.A, true);
  assertEq(Engine.legal(s).toCall, 50);         // B
  s = A(s, 'call');
  assertEq(s.hand.bets.B, 250);
});
test('raise bounds become null when raising is impossible', function () {
  var s = hand3(100, 250);
  s = A(s, 'raise', 200); // B
  var l = Engine.legal(s); // C: min 300 > max 250
  assertEq(l.minRaiseTo, null); assertEq(l.maxRaiseTo, null);
});
test('blind equal to limit is all in at once', function () {
  var s = Engine.startHand(mk(3, 100, 100));
  assertEq(s.hand.allIn.A, true);
});
test('a raise reopens action for players who already acted', function () {
  var s = hand3();
  s = A(s, 'call'); s = A(s, 'call'); s = A(s, 'raise', 200); // A raises at option
  assertEq(s.hand.phase, 'betting');
  assertEq(Engine.legal(s).id, 'B');
  s = A(s, 'call'); s = A(s, 'call');
  assertEq(s.hand.phase, 'roundEnd');
});
test('actions do not mutate the previous session', function () {
  var s = hand3(), before = JSON.stringify(s);
  A(s, 'call');
  assertEq(JSON.stringify(s), before);
});
