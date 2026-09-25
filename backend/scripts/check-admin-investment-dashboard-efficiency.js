const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../src/services/adminInvestmentService.js'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(source.includes('const allLeadIds = [...new Set(investors.flatMap'), 'Admin investment dashboard must batch linked-lead metrics');
assert(source.includes('WHERE l.id=ANY($1::int[])'), 'Admin investment dashboard must aggregate lead metrics in one query');
const loopStart = source.indexOf('for (const investor of investors) {');
const loopEnd = loopStart >= 0 ? source.indexOf('}', loopStart) : -1;
const loopBody = loopStart >= 0 && loopEnd > loopStart ? source.slice(loopStart, loopEnd) : '';
assert(!loopBody.includes('pool.query'), 'Admin investment dashboard must not issue a database query per investor');

console.log('Admin investment dashboard query efficiency regression test passed.');
