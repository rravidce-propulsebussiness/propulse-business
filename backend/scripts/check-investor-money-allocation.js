const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseMoneyPaise, paiseToMoney, allocatePaise } = require('../src/utils/money');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'investorFinancialLedgerService.js'), 'utf8');
assert.match(source, /allocatePaise/);
assert.match(source, /investmentPaise/);
assert.match(source, /totalPaise/);
assert.match(source, /grossPaise/);

const gross = parseMoneyPaise('100.00');
const total = parseMoneyPaise('100.00');
assert.equal(paiseToMoney(allocatePaise(gross, '95', parseMoneyPaise('60.00'), total)), 57);
assert.equal(paiseToMoney(allocatePaise(gross, '95', parseMoneyPaise('40.00'), total)), 38);
assert.equal(
  allocatePaise(parseMoneyPaise('0.03'), '95', parseMoneyPaise('0.01'), parseMoneyPaise('0.03')),
  1n
);
assert.equal(
  allocatePaise(parseMoneyPaise('100.00'), '95', parseMoneyPaise('50.00'), parseMoneyPaise('100.00')) +
  allocatePaise(parseMoneyPaise('100.00'), '95', parseMoneyPaise('50.00'), parseMoneyPaise('100.00')),
  9500n
);

console.log('Investor money allocation checks passed.');
