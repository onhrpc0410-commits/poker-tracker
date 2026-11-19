var UI = window.UI || (window.UI = {});
UI.session = null;
UI.el = function (tag, props, kids) {
  var e = document.createElement(tag), k;
  props = props || {};
  for (k in props) {
    if (props[k] === null || props[k] === undefined) continue;
    if (k === 'text') e.textContent = props[k];
    else if (k === 'className') e.className = props[k];
    else if (k.slice(0, 2) === 'on') e[k] = props[k];
    else e.setAttribute(k, props[k]);
  }
  kids = kids || [];
  for (var i = 0; i < kids.length; i++) if (kids[i]) e.appendChild(kids[i]);
  return e;
};
UI.fmt = function (n) {
  var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + s;
};
UI.fmtSigned = function (n) { return (n > 0 ? '+' : '') + UI.fmt(n); };
UI.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); };
UI.showScreen = function (name) {
  var names = ['players', 'setup', 'game', 'summary'];
  for (var i = 0; i < names.length; i++) document.getElementById('screen-' + names[i]).hidden = names[i] !== name;
  if (UI[name] && UI[name].render) UI[name].render();
};
UI.save = function () { if (UI.session) Store.saveSession(UI.session); };
UI.endSession = function () {
  if (UI.session) Store.setBalances(UI.session.balances);
  Store.clearSession(); UI.session = null;
  UI.showScreen('players');
};
document.getElementById('warn').hidden = Store.available();
UI.session = Store.loadSession();
UI.showScreen('players');
