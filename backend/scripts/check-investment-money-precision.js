const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseMoneyPaise, paiseToMoney } = require('../src/utils/money');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'investmentService.js'), 'utf8');

assert.match(source, /parseMoneyPaise/);
assert.match(source, /paiseToMoney/);
assert.match(source, /balancePaise/);
assert.match(source, /valuePaise/);
assert.match(source, /reinvestPaise/);

assert.equal(parseMoneyPaise('0.01') + parseMoneyPaise('0.02'), 3n);
assert.equal(paiseToMoney(parseMoneyPaise('123456.78')), 123456.78);
assert.equal(parseMoneyPaise('1000.00') - parseMoneyPaise('0.01'), 99999n);
assert.equal(paiseToMoney(parseMoneyPaise('999.99')), 999.99);

console.log('Investment money precision checks passed.');
