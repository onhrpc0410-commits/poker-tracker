var UI = window.UI || (window.UI = {});
UI.game = {
  raiseTo: null, picked: [], bonus: false, error: '',
  apply: function (fn) {
    try { UI.session = fn(UI.session); UI.save(); this.error = ''; }
    catch (e) { this.error = e.message; }
    this.raiseTo = null; this.render();
  },
  render: function () {
    var s = UI.session, root = document.getElementById('screen-game'), el = UI.el, self = this;
    UI.clear(root);
    if (!s) { UI.showScreen('players'); return; }
    var h = s.hand, bal = Engine.balances(s), pot = 0, id;
    if (h) for (id in h.bets) pot += h.bets[id];
    root.appendChild(el('div', { className: 'potbg', text: UI.fmt(pot) }));
    var box = el('div', { className: 'gamebox' });
    root.appendChild(box);
    box.appendChild(el('div', { className: 'toprow' }, [
      el('b', { text: 'POT ' + UI.fmt(pot) }),
      el('span', { text: h ? 'Hand #' + h.n + '  Round ' + h.round + '  Current bet ' + UI.fmt(h.currentBet) : 'Hand finished' }),
      el('span', { className: 'grow' }),
      el('button', { text: 'UNDO', disabled: Engine.canUndo(s) ? null : 'disabled', onclick: function () { self.apply(Engine.undo); } }),
      el('button', { text: 'SUMMARY', onclick: function () { UI.showScreen('summary'); } })
    ]));
    var seats = el('div', { className: 'seats' });
    s.seats.forEach(function (p, i) {
      var cls = 'seat';
      var turn = h && h.phase === 'betting' && h.turnIdx === i;
      if (turn) cls += ' turn';
      if (h && h.folded[p.id]) cls += ' folded';
      var bet = '';
      if (h) bet = h.folded[p.id] ? 'FOLD' : (h.allIn[p.id] ? 'ALL IN ' + UI.fmt(h.bets[p.id]) : 'bet ' + UI.fmt(h.bets[p.id]));
      seats.appendChild(el('div', { className: cls }, [
        el('div', { className: 'sname', text: (h && h.blindIdx === i ? '[B] ' : '') + p.name }),
        el('div', { className: 'sbal ' + (bal[p.id] < 0 ? 'neg' : ''), text: UI.fmt(bal[p.id]) }),
        el('div', { className: 'sbet', text: bet })
      ]));
    });
    box.appendChild(seats);
    box.appendChild(el('div', { className: 'err', text: self.error }));
    var actions = el('div', { className: 'actions' });
    box.appendChild(actions);
    if (!h) self.renderBetween(actions);
    else if (h.phase === 'betting') self.renderBetting(actions);
    else if (h.phase === 'roundEnd') {
      actions.appendChild(el('button', { className: 'big', text: 'NEXT ROUND', onclick: function () { self.apply(Engine.nextRound); } }));
      actions.appendChild(el('button', { className: 'big', text: 'SHOWDOWN', onclick: function () { self.apply(Engine.toShowdown); } }));
    } else self.renderShowdown(actions);
  },
  renderBetting: function (actions) {
    var s = UI.session, el = UI.el, self = this, l = Engine.legal(s);
    var who = s.seats.filter(function (p) { return p.id === l.id; })[0].name;
    actions.appendChild(el('div', { className: 'turnname', text: who + ' to act' }));
    actions.appendChild(el('button', { className: 'big', text: l.canCheck ? 'CHECK' : 'CALL ' + UI.fmt(l.toCall),
      onclick: function () { self.apply(function (x) { return Engine.act(x, { type: l.canCheck ? 'check' : 'call' }); }); } }));
    if (self.raiseTo !== null) {
      actions.appendChild(el('button', { text: '-', onclick: function () { self.raiseTo = Math.max(l.minRaiseTo, self.raiseTo - s.step); self.render(); } }));
      actions.appendChild(el('b', { className: 'raisev', text: 'RAISE TO ' + UI.fmt(self.raiseTo) }));
      actions.appendChild(el('button', { text: '+', onclick: function () { self.raiseTo = Math.min(l.maxRaiseTo, self.raiseTo + s.step); self.render(); } }));
      actions.appendChild(el('button', { className: 'big go', text: 'CONFIRM', onclick: function () {
        var r = self.raiseTo; self.apply(function (x) { return Engine.act(x, { type: 'raise', raiseTo: r }); });
      } }));
      actions.appendChild(el('button', { text: 'CANCEL', onclick: function () { self.raiseTo = null; self.render(); } }));
    } else {
      actions.appendChild(el('button', { className: 'big', text: 'RAISE', disabled: l.minRaiseTo === null ? 'disabled' : null,
        onclick: function () { self.raiseTo = l.minRaiseTo; self.render(); } }));
      actions.appendChild(el('button', { className: 'big', text: 'ALL IN',
        onclick: function () { self.apply(function (x) { return Engine.act(x, { type: 'allin' }); }); } }));
      actions.appendChild(el('button', { className: 'big', text: 'FOLD',
        onclick: function () { self.apply(function (x) { return Engine.act(x, { type: 'fold' }); }); } }));
    }
  },
  renderShowdown: function (actions) {
    var s = UI.session, h = s.hand, el = UI.el, self = this;
    var live = s.seats.filter(function (p) { return !h.folded[p.id]; });
    if (live.length === 1) self.picked = [live[0].id];
    self.picked = self.picked.filter(function (id) { return live.some(function (p) { return p.id === id; }); });
    actions.appendChild(el('div', { className: 'turnname', text: 'Pick the winner' }));
    live.forEach(function (p) {
      var on = self.picked.indexOf(p.id) >= 0;
      actions.appendChild(el('button', { className: 'big' + (on ? ' go' : ''), text: p.name, onclick: function () {
        if (on) self.picked.splice(self.picked.indexOf(p.id), 1); else self.picked.push(p.id);
        if (self.picked.length !== 1) self.bonus = false;
        self.render();
      } }));
    });
    var single = self.picked.length === 1;
    var cb = el('input', { type: 'checkbox', style: 'min-height:0;width:20px;height:20px' });
    cb.checked = self.bonus && single; cb.disabled = !single;
    cb.onchange = function () { self.bonus = cb.checked; };
    actions.appendChild(el('label', { className: 'small' }, [cb, el('span', { text: ' 7-2 BONUS' })]));
    actions.appendChild(el('button', { className: 'big go', text: 'CONFIRM', disabled: self.picked.length ? null : 'disabled', onclick: function () {
      var w = self.picked.slice(), b = self.bonus && single;
      self.picked = []; self.bonus = false;
      self.apply(function (x) { return Engine.settle(x, { winners: w, bonus72: b }); });
    } }));
  },
  renderBetween: function (actions) {
    var s = UI.session, el = UI.el, self = this, last = s.hands[s.hands.length - 1];
    if (last) {
      var parts = [];
      s.seats.forEach(function (p) { parts.push(p.name + ' ' + UI.fmtSigned(last.deltas[p.id])); });
      actions.appendChild(el('div', { className: 'turnname', text: 'Hand #' + last.n + (last.bonus72 ? ' (7-2)' : '') + ': ' + parts.join('   ') }));
    }
    actions.appendChild(el('button', { className: 'big go', text: 'NEXT HAND', onclick: function () { self.apply(Engine.startHand); } }));
  }
};
