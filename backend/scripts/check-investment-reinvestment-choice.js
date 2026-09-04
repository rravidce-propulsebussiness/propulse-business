const assert = require('assert');
const fs = require('fs');
const path = require('path');

const service = fs.readFileSync(path.join(__dirname, '../src/services/investmentService.js'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, '../src/controllers/investmentController.js'), 'utf8');
const routes = fs.readFileSync(path.join(__dirname, '../src/routes/investmentRoutes.js'), 'utf8');
const investmentUi = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/Investment.jsx'), 'utf8');

assert(service.includes('async function reinvestInvestment({ userId, investmentId })'), 'Reinvestment service is missing');
assert(service.includes("String(inv.status).toLowerCase() !== 'paid'"), 'Reinvestment must require a settled cycle');
assert(service.includes('parent_investment_id=$1'), 'Reinvestment must link the child to its parent');
assert(service.includes('REINVESTMENT_EXISTS'), 'Duplicate reinvestment must be rejected');
assert(service.includes('reinvestAmount > Number(rule.maximum_amount)'), 'Reinvestment maximum must remain protected');
assert(service.includes('full realized amount'), 'Reinvestment should document that it carries the realized amount');
assert(!service.includes("payout>=minRule"), 'Reinvestment must not require the normal minimum investment amount');
assert(!service.includes('Automatic reinvestment of realized proceeds'), 'Payout must not automatically reinvest');
assert(controller.includes('service.reinvestInvestment'), 'Controller must expose investor reinvestment');
assert(routes.includes("router.post('/:id/reinvest'"), 'Investor reinvestment route is missing');
assert(investmentUi.includes('reinvestment_available'), 'Investor UI must surface the reinvestment choice');
assert(investmentUi.includes('Reinvest'), 'Investor UI must include a reinvest action');
assert(investmentUi.includes('Keep in wallet'), 'Investor UI must offer the keep-in-wallet choice');

console.log('Investor-choice reinvestment regression test passed.');
