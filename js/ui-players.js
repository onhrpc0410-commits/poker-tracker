var UI = window.UI || (window.UI = {});
UI.players = {
  error: '',
  render: function () {
    var root = document.getElementById('screen-players'), el = UI.el, self = this;
    UI.clear(root);
    root.appendChild(el('h1', { text: 'Players' }));
    if (UI.session) {
      root.appendChild(el('div', { className: 'row' }, [
        el('span', { className: 'grow', text: 'A game is in progress.' }),
        el('button', { className: 'go', text: 'RESUME', onclick: function () { UI.showScreen('game'); } }),
        el('button', { text: 'DISCARD', onclick: function () {
          if (confirm('Discard the game in progress? Unfinished hand is lost.')) UI.endSessionDiscard();
        } })
      ]));
    }
    var list = Store.loadPlayers();
    for (var i = 0; i < list.length; i++) root.appendChild(self.row(list[i]));
    if (!list.length) root.appendChild(el('p', { text: 'No players yet.' }));
    var name = el('input', { type: 'text', placeholder: 'Name', maxlength: '20' });
    var err = el('div', { className: 'err', text: self.error });
    root.appendChild(el('div', { className: 'row' }, [name,
      el('button', { text: 'ADD', onclick: function () {
        try { Store.addPlayer(name.value); self.error = ''; } catch (e) { self.error = e.message; }
        self.render();
      } })]));
    root.appendChild(err);
    root.appendChild(el('button', { text: 'RESET ALL TO 0', style: 'margin-right:10px', onclick: function () {
      if (UI.session) { self.error = 'Finish or discard the game first.'; self.render(); return; }
      if (confirm('Reset EVERYONE to 0? This cannot be undone.')) { Store.resetAllBalances(); self.render(); }
    } }));
    root.appendChild(el('button', { className: 'go', text: 'NEW GAME', disabled: list.length < 2 ? 'disabled' : null,
      onclick: function () { UI.showScreen('setup'); } }));
    if (list.length < 2) root.appendChild(el('span', { text: '  Add at least 2 players.' }));
  },
  row: function (p) {
    var el = UI.el, self = this;
    var amt = el('input', { type: 'number', placeholder: '+/- amount', step: '1', style: 'width:140px' });
    return el('div', { className: 'row' }, [
      el('span', { className: 'grow', text: p.name }),
      el('b', { className: p.balance < 0 ? 'neg' : 'pos', text: UI.fmt(p.balance) }),
      amt,
      el('button', { text: 'ADJUST', onclick: function () {
        if (UI.session) { self.error = 'Finish or discard the game first.'; self.render(); return; }
        var n = amt.value === '' ? NaN : Number(amt.value);
        try { Store.adjustBalance(p.id, n); self.error = ''; } catch (e) { self.error = e.message; }
        self.render();
      } }),
      el('button', { text: 'RESET 0', onclick: function () {
        if (UI.session) { self.error = 'Finish or discard the game first.'; self.render(); return; }
        if (confirm('Reset ' + p.name + ' to 0?')) { Store.resetBalance(p.id); self.render(); }
      } }),
      el('button', { text: 'DELETE', onclick: function () {
        if (UI.session) { self.error = 'Finish or discard the game first.'; self.render(); return; }
        if (confirm('Delete ' + p.name + '?')) { Store.removePlayer(p.id); self.render(); }
      } })
    ]);
  }
};
UI.endSessionDiscard = function () { Store.clearSession(); UI.session = null; UI.showScreen('players'); };
