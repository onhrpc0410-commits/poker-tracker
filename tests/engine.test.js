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
