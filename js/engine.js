var Engine = (function () {
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  // Returns a deep copy of s whose undo stack has s (without its own stack) pushed.
  function next(s) {
    var snap = clone(s); snap.undo = [];
    var c = clone(s);
    c.undo = s.undo.concat([JSON.stringify(snap)]);
    if (c.undo.length > 50) c.undo = c.undo.slice(c.undo.length - 50);
    return c;
  }

  function newSession(o) {
    if (!o || !o.players || o.players.length < 2) throw new Error('At least 2 players required');
    if (!isInt(o.step) || o.step < 1) throw new Error('Raise step must be a whole number of 1 or more');
    if (!isInt(o.limit) || o.limit < o.step) throw new Error('All in limit must be at least the raise step');
    var s = { seats: [], startBalances: {}, balances: {}, step: o.step, limit: o.limit, blindIdx: -1, hand: null, hands: [], undo: [] };
    for (var i = 0; i < o.players.length; i++) {
      var p = o.players[i], b = o.balances && o.balances[p.id] ? o.balances[p.id] : 0;
      s.seats.push({ id: p.id, name: p.name });
      s.startBalances[p.id] = b; s.balances[p.id] = b;
    }
    return s;
  }

  function startHand(s) {
    if (s.hand) throw new Error('A hand is already in progress');
    var c = next(s), n = c.seats.length;
    c.blindIdx = (c.blindIdx + 1) % n;
    var blind = c.seats[c.blindIdx].id;
    var h = { n: c.hands.length + 1, blindIdx: c.blindIdx, round: 1, phase: 'betting', turnIdx: (c.blindIdx + 1) % n,
      currentBet: c.step, roundBets: {}, bets: {}, folded: {}, allIn: {}, acted: {}, log: [] };
    for (var i = 0; i < n; i++) { h.roundBets[c.seats[i].id] = 0; h.bets[c.seats[i].id] = 0; }
    h.roundBets[blind] = c.step; h.bets[blind] = c.step;
    h.log.push({ id: blind, type: 'blind', amount: c.step });
    c.hand = h;
    return c;
  }

  function balances(s) {
    var r = {}, id;
    for (id in s.balances) r[id] = s.balances[id] - (s.hand ? s.hand.bets[id] || 0 : 0);
    return r;
  }

  return { _clone: clone, _next: next, _isInt: isInt, newSession: newSession, startHand: startHand, balances: balances };
})();
