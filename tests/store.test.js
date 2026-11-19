function fakeBackend() {
  var d = {};
  return {
    getItem: function (k) { return d.hasOwnProperty(k) ? d[k] : null; },
    setItem: function (k, v) { d[k] = String(v); },
    removeItem: function (k) { delete d[k]; }
  };
}
test('addPlayer trims, starts at 0 and persists', function () {
  var b = fakeBackend(); Store._useBackend(b);
  var p = Store.addPlayer(' Alice ');
  assertEq(p.name, 'Alice'); assertEq(p.balance, 0);
  Store._useBackend(b);
  assertEq(Store.loadPlayers().length, 1);
});
test('addPlayer rejects empty, whitespace, 21 chars', function () {
  Store._useBackend(fakeBackend());
  assertThrows(function () { Store.addPlayer(''); });
  assertThrows(function () { Store.addPlayer('   '); });
  assertThrows(function () { Store.addPlayer('123456789012345678901'); });
});
test('addPlayer rejects duplicate names case-insensitively', function () {
  Store._useBackend(fakeBackend());
  Store.addPlayer('Alice');
  assertThrows(function () { Store.addPlayer('alice'); });
});
test('adjustBalance applies integer delta and rejects non-integers', function () {
  Store._useBackend(fakeBackend());
  var p = Store.addPlayer('Bob');
  Store.adjustBalance(p.id, -1000);
  assertEq(Store.loadPlayers()[0].balance, -1000);
  assertThrows(function () { Store.adjustBalance(p.id, 1.5); });
  assertThrows(function () { Store.adjustBalance(p.id, 'x'); });
});
test('removePlayer removes', function () {
  Store._useBackend(fakeBackend());
  var p = Store.addPlayer('Bob'); Store.removePlayer(p.id);
  assertEq(Store.loadPlayers().length, 0);
});
test('setBalances overwrites balances by id', function () {
  Store._useBackend(fakeBackend());
  var p = Store.addPlayer('Bob'); var m = {}; m[p.id] = 700;
  Store.setBalances(m);
  assertEq(Store.loadPlayers()[0].balance, 700);
});
test('no backend: available false, loadPlayers [] without throwing', function () {
  Store._useBackend(null);
  assertEq(Store.available(), false);
  assertEq(Store.loadPlayers(), []);
});
test('session save/load/clear', function () {
  Store._useBackend(fakeBackend());
  Store.saveSession({ a: 1 });
  assertEq(Store.loadSession(), { a: 1 });
  Store.clearSession();
  assertEq(Store.loadSession(), null);
});
