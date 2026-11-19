var UI = window.UI || (window.UI = {});
UI.setup = {
  picked: [], step: '100', limit: '1000', error: '',
  render: function () {
    var root = document.getElementById('screen-setup'), el = UI.el, self = this;
    UI.clear(root);
    root.appendChild(el('h1', { text: 'Game setup' }));
    root.appendChild(el('p', { text: 'Tap players in seat order (counter-clockwise). First tapped is the first blind.' }));
    var list = Store.loadPlayers();
    self.picked = self.picked.filter(function (id) { return list.some(function (p) { return p.id === id; }); });
    list.forEach(function (p) {
      var idx = self.picked.indexOf(p.id);
      root.appendChild(el('div', { className: 'row' }, [
        el('button', { text: idx >= 0 ? (idx + 1) + '. ' + p.name : p.name, style: idx >= 0 ? 'background:#1a7f37;color:#fff;min-width:200px' : 'min-width:200px',
          onclick: function () {
            if (idx >= 0) self.picked.splice(idx, 1); else self.picked.push(p.id);
            self.render();
          } }),
        el('span', { className: 'grow', text: UI.fmt(p.balance) }),
        el('button', { text: 'RESET 0', onclick: function () {
          if (confirm('Reset ' + p.name + ' to 0?')) { Store.resetBalance(p.id); self.render(); }
        } })
      ]));
    });
    var step = el('input', { type: 'number', value: self.step, min: '1', step: '1' });
    var limit = el('input', { type: 'number', value: self.limit, min: '1', step: '1' });
    step.oninput = function () { self.step = step.value; };
    limit.oninput = function () { self.limit = limit.value; };
    root.appendChild(el('div', { className: 'row' }, [el('span', { text: 'RAISE STEP' }), step, el('span', { text: 'ALL IN LIMIT' }), limit]));
    root.appendChild(el('div', { className: 'err', text: self.error }));
    root.appendChild(el('button', { text: 'RESET ALL TO 0', style: 'margin-right:10px', onclick: function () {
      if (confirm('Reset EVERYONE to 0? This cannot be undone.')) { Store.resetAllBalances(); self.render(); }
    } }));
    root.appendChild(el('button', { text: 'BACK', onclick: function () { UI.showScreen('players'); } }));
    root.appendChild(el('button', { className: 'go', text: 'START', style: 'margin-left:10px', onclick: function () {
      try {
        var players = self.picked.map(function (id) { return list.filter(function (p) { return p.id === id; })[0]; });
        var bal = {}; players.forEach(function (p) { bal[p.id] = p.balance; });
        var s = Engine.newSession({ players: players, balances: bal, step: Number(self.step), limit: Number(self.limit) });
        UI.session = Engine.startHand(s); UI.save(); self.error = '';
        UI.game.raiseTo = null;
        UI.showScreen('game');
      } catch (e) { self.error = e.message; self.render(); }
    } }));
  }
};
