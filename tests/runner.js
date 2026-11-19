var __tests = [];
function test(name, fn) { __tests.push({ name: name, fn: fn }); }
function assertEq(actual, expected, msg) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg ? msg + ': ' : '') + 'expected ' + e + ' got ' + a);
}
function assertThrows(fn, msg) {
  var threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error((msg || 'expected throw') + ' but did not throw');
}
function runAll() {
  var pass = 0, fail = 0, lines = [];
  for (var i = 0; i < __tests.length; i++) {
    try { __tests[i].fn(); pass++; }
    catch (e) { fail++; lines.push('FAIL ' + __tests[i].name + ' :: ' + e.message); }
  }
  var out = document.getElementById('out');
  out.textContent = 'RESULT PASS ' + pass + ' / FAIL ' + fail + '\n' + lines.join('\n');
  document.title = fail === 0 ? 'GREEN' : 'RED';
}
