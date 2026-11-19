var Store = (function () {
  var backend = null;
  function probe() {
    try {
      var b = window.localStorage;
      b.setItem('pt.probe', '1'); b.removeItem('pt.probe');
      return b;
    } catch (e) { return null; }
  }
  backend = probe();
  function read(key, fallback) {
    if (!backend) return fallback;
    try {
      var v = backend.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    if (!backend) return false;
    try { backend.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { backend = null; return false; }
  }
  function loadPlayers() { return read('pt.players', []); }
  function savePlayers(list) { write('pt.players', list); }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  return {
    _useBackend: function (b) { backend = b; },
    available: function () { return !!backend; },
    loadPlayers: loadPlayers,
    addPlayer: function (name) {
      name = String(name || '').replace(/^\s+|\s+$/g, '');
      if (!name) throw new Error('Name is required');
      if (name.length > 20) throw new Error('Name must be 20 characters or less');
      var list = loadPlayers();
      for (var i = 0; i < list.length; i++) {
        if (list[i].name.toLowerCase() === name.toLowerCase()) throw new Error('Name already exists');
      }
      var p = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), name: name, balance: 0 };
      list.push(p); savePlayers(list);
      return p;
    },
    removePlayer: function (id) {
      savePlayers(loadPlayers().filter(function (p) { return p.id !== id; }));
    },
    adjustBalance: function (id, delta) {
      if (!isInt(delta)) throw new Error('Amount must be a whole number');
      var list = loadPlayers();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) list[i].balance += delta;
      savePlayers(list);
    },
    setBalances: function (map) {
      var list = loadPlayers();
      for (var i = 0; i < list.length; i++) if (map.hasOwnProperty(list[i].id)) list[i].balance = map[list[i].id];
      savePlayers(list);
    },
    resetBalance: function (id) {
      var list = loadPlayers();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) list[i].balance = 0;
      savePlayers(list);
    },
    resetAllBalances: function () {
      var list = loadPlayers();
      for (var i = 0; i < list.length; i++) list[i].balance = 0;
      savePlayers(list);
    },
    saveSession: function (s) { return write('pt.session', s); },
    loadSession: function () { return read('pt.session', null); },
    clearSession: function () { if (backend) { try { backend.removeItem('pt.session'); } catch (e) {} } }
  };
})();
