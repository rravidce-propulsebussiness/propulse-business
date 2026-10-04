const assert = require('node:assert/strict');
const { parseMoneyPaise, paiseToMoney } = require('../src/utils/money');

const p = value => parseMoneyPaise(value);
assert.equal(p('0.01'), 1n);
assert.equal(p('0.10') + p('0.20'), 30n);
assert.equal(p('999.99') - p('0.01'), 99998n);
assert.equal(p('1000.00') - p('333.33'), 66667n);
assert.equal(p('999999.99'), 99999999n);
assert.equal(parseMoneyPaise('0.00', { allowZero: true }), 0n);
assert.equal(paiseToMoney(p('1234.56')), 1234.56);
assert.equal(paiseToMoney(p('0.01')), 0.01);
assert.throws(() => parseMoneyPaise('0.00'), /greater than zero/);
assert.throws(() => parseMoneyPaise('-0.01'), /greater than zero/);
assert.throws(() => parseMoneyPaise('abc'), /valid monetary value/);

console.log('Wallet money precision checks passed.');
