const assert = require('assert');
const fs = require('fs');
const path = require('path');

const service = fs.readFileSync(path.join(__dirname, '../src/services/investmentService.js'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, '../src/controllers/investmentController.js'), 'utf8');
const routes = fs.readFileSync(path.join(__dirname, '../src/routes/investmentRoutes.js'), 'utf8');
const investmentUi = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/Investment.jsx'), 'utf8');

const reinvestStart = service.indexOf('async function reinvestInvestment');
const reinvestEnd = service.indexOf('\nasync function adminList', reinvestStart);
const reinvestBlock = reinvestStart >= 0 && reinvestEnd > reinvestStart ? service.slice(reinvestStart, reinvestEnd) : '';

assert(/async function reinvestInvestment\(\{\s*userId,\s*investmentId\s*\}\)/.test(service), 'Reinvestment service is missing');
assert(reinvestBlock.includes("String(inv.status).toLowerCase()!=='paid'"), 'Reinvestment must require a settled cycle');
assert(reinvestBlock.includes('parent_investment_id=$1'), 'Reinvestment must link the child to its parent');
assert(reinvestBlock.includes('REINVESTMENT_EXISTS'), 'Duplicate reinvestment must be rejected');
assert(reinvestBlock.includes('reinvestAmount>Number(rule.maximum_amount)'), 'Reinvestment maximum must remain protected');
assert(reinvestBlock.includes('expected_return'), 'Reinvestment must create a new cycle from the realized amount');
assert(!reinvestBlock.includes('walletService'), 'Reinvestment must not use wallet funds');
assert(!reinvestBlock.includes('wallet_transactions'), 'Reinvestment must not debit the wallet');
assert(controller.includes('service.reinvestInvestment'), 'Controller must expose investor reinvestment');
assert(routes.includes("router.post('/:id/reinvest'"), 'Investor reinvestment route is missing');
assert(investmentUi.includes('checked={reinvestmentEnabled}'), 'Investor UI must bind the reinvestment choice');
assert(investmentUi.includes('reinvestmentEnabled })'), 'Investor checkout must persist the reinvestment choice');
assert(investmentUi.includes('Direct owner transfer'), 'Investor UI must describe owner-account payout flow');

console.log('Investor-choice reinvestment regression test passed.');
