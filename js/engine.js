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
    if (h.bets[blind] >= c.limit) h.allIn[blind] = true;
    c.hand = h;
    settleFlow(c);
    return c;
  }

  function seatId(s, i) { return s.seats[i].id; }
  function canActIds(s) {
    var h = s.hand, r = [];
    for (var i = 0; i < s.seats.length; i++) {
      var id = s.seats[i].id;
      if (!h.folded[id] && !h.allIn[id]) r.push(i);
    }
    return r;
  }
  function activeCount(s) {
    var n = 0;
    for (var i = 0; i < s.seats.length; i++) if (!s.hand.folded[s.seats[i].id]) n++;
    return n;
  }
  function nextActor(s, from) {
    var n = s.seats.length;
    for (var k = 1; k <= n; k++) {
      var i = (from + k) % n, id = s.seats[i].id;
      if (!s.hand.folded[id] && !s.hand.allIn[id]) return i;
    }
    return -1;
  }
  // Decide phase and next turn after any change. Mutates s (already a copy).
  function settleFlow(s) {
    var h = s.hand;
    if (activeCount(s) === 1) { h.phase = 'showdown'; return; }
    var can = canActIds(s);
    if (can.length === 0) { h.phase = 'showdown'; return; }
    var done = true;
    for (var i = 0; i < can.length; i++) {
      var id = s.seats[can[i]].id;
      if (!h.acted[id] || h.roundBets[id] !== h.currentBet) done = false;
    }
    if (done) { h.phase = can.length <= 1 ? 'showdown' : 'roundEnd'; return; }
    h.phase = 'betting';
    if (h.turnIdx < 0 || h.folded[seatId(s, h.turnIdx)] || h.allIn[seatId(s, h.turnIdx)]) h.turnIdx = nextActor(s, h.turnIdx);
  }

  function legal(s) {
    var h = s.hand;
    if (!h || h.phase !== 'betting') throw new Error('No action available');
    var id = seatId(s, h.turnIdx);
    var toCall = Math.min(h.currentBet - h.roundBets[id], s.limit - h.bets[id]);
    var min = h.currentBet + s.step, max = s.limit - h.bets[id] + h.roundBets[id];
    return { id: id, toCall: toCall, canCheck: toCall === 0,
      minRaiseTo: min <= max ? min : null, maxRaiseTo: min <= max ? max : null };
  }

  function pay(s, id, amount) {
    var h = s.hand;
    h.roundBets[id] += amount; h.bets[id] += amount;
    if (h.bets[id] >= s.limit) h.allIn[id] = true;
  }

  function act(s, a) {
    var l = legal(s), id = l.id, c = next(s), h = c.hand, type = a.type, amount = 0;
    if (type === 'check') {
      if (!l.canCheck) throw new Error('Cannot check');
    } else if (type === 'call') {
      if (l.toCall <= 0) throw new Error('Nothing to call');
      amount = l.toCall; pay(c, id, amount);
    } else if (type === 'raise') {
      var r = a.raiseTo;
      if (l.minRaiseTo === null || !isInt(r) || r < l.minRaiseTo || r > l.maxRaiseTo || (r - h.currentBet) % c.step !== 0) throw new Error('Invalid raise');
      amount = r - h.roundBets[id]; pay(c, id, amount);
      h.currentBet = r; h.acted = {};
    } else if (type === 'allin') {
      amount = c.limit - h.bets[id];
      if (amount <= 0) throw new Error('Already all in');
      pay(c, id, amount);
      if (h.roundBets[id] > h.currentBet) { h.currentBet = h.roundBets[id]; h.acted = {}; }
    } else if (type === 'fold') {
      h.folded[id] = true;
    } else throw new Error('Unknown action');
    h.acted[id] = true;
    h.log.push({ id: id, type: type, amount: amount });
    h.turnIdx = nextActor(c, h.turnIdx);
    settleFlow(c);
    return c;
  }

  function nextRound(s) {
    if (!s.hand || s.hand.phase !== 'roundEnd') throw new Error('Round is not finished');
    var c = next(s), h = c.hand;
    for (var i = 0; i < c.seats.length; i++) h.roundBets[c.seats[i].id] = 0;
    h.currentBet = 0; h.acted = {}; h.round += 1; h.phase = 'betting';
    h.turnIdx = nextActor(c, h.blindIdx);
    return c;
  }

  function toShowdown(s) {
    if (!s.hand || s.hand.phase !== 'roundEnd') throw new Error('Round is not finished');
    var c = next(s); c.hand.phase = 'showdown';
    return c;
  }

  function balances(s) {
    var r = {}, id;
    for (id in s.balances) r[id] = s.balances[id] - (s.hand ? s.hand.bets[id] || 0 : 0);
    return r;
  }

  return { _clone: clone, _next: next, _isInt: isInt, newSession: newSession, startHand: startHand, balances: balances,
    legal: legal, act: act, nextRound: nextRound, toShowdown: toShowdown };
})();
