var UI = window.UI || (window.UI = {});
UI.summary = {
  render: function () {
    var s = UI.session, root = document.getElementById('screen-summary'), el = UI.el;
    UI.clear(root);
    if (!s) { UI.showScreen('players'); return; }
    root.appendChild(el('h1', { text: 'Session result' }));
    Engine.sessionResult(s).forEach(function (r) {
      root.appendChild(el('div', { className: 'row' }, [
        el('span', { className: 'grow', text: r.name }),
        el('b', { className: r.net > 0 ? 'pos' : '', text: UI.fmtSigned(r.net) })
      ]));
    });
    root.appendChild(el('h2', { text: 'Hand history', style: 'margin-top:20px' }));
    var names = {}; s.seats.forEach(function (p) { names[p.id] = p.name; });
    if (!s.hands.length) root.appendChild(el('p', { text: 'No hands yet.' }));
    s.hands.slice().reverse().forEach(function (hd) {
      var log = hd.log.map(function (l) { return names[l.id] + ' ' + l.type + (l.amount ? ' ' + UI.fmt(l.amount) : ''); }).join(', ');
      var head = '#' + hd.n + '  blind ' + names[hd.blind] + '  pot ' + UI.fmt(hd.pot) + '  winner ' +
        hd.winners.map(function (w) { return names[w]; }).join('+') + (hd.bonus72 ? '  7-2' : '');
      root.appendChild(el('details', { className: 'row', style: 'display:block' }, [
        el('summary', { text: head }),
        el('div', { text: log }),
        el('div', { text: s.seats.map(function (p) { return p.name + ' ' + UI.fmtSigned(hd.deltas[p.id]); }).join('   ') })
      ]));
    });
    root.appendChild(el('div', { style: 'margin-top:16px' }, [
      el('button', { text: 'BACK TO GAME', onclick: function () { UI.showScreen('game'); } }),
      el('button', { className: 'go', text: 'END SESSION', style: 'margin-left:10px', onclick: function () {
        if (confirm('End the session? An unfinished hand is discarded and balances are saved.')) UI.endSession();
      } })
    ]));
  }
};
