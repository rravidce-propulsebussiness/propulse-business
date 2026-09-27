const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../src/services/adminInvestmentService.js'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, '../src/controllers/adminCommercialController.js'), 'utf8');
const ledger = fs.readFileSync(path.join(__dirname, '../src/services/investorFinancialLedgerService.js'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(source.includes('const allLeadIds = [...new Set(investors.flatMap'), 'Admin investment dashboard must batch linked-lead metrics');
assert(source.includes('WHERE l.id=ANY($1::int[])'), 'Admin investment dashboard must aggregate lead metrics in one query');
const loopStart = source.indexOf('for (const investor of investors) {');
const loopEnd = loopStart >= 0 ? source.indexOf('}', loopStart) : -1;
const loopBody = loopStart >= 0 && loopEnd > loopStart ? source.slice(loopStart, loopEnd) : '';
assert(!loopBody.includes('pool.query'), 'Admin investment dashboard must not issue a database query per investor');
assert(controller.includes('ledger.getInvestorFinancialSummaries'), 'Admin investment controller must batch financial summaries');
assert(!controller.includes('Promise.all((dashboard?.investors||[]).map'), 'Admin investment controller must not run per-investor async enrichment');
assert(ledger.includes('WITH scope AS')&&ledger.includes('UNNEST($1::int[], $2::int[])'), 'Investor ledger batch read must use one scoped query');

console.log('Admin investment dashboard query efficiency regression test passed.');
