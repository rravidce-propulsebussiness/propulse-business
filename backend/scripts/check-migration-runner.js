const assert = require('assert');
const { hasTransactionControl, isNoTransactionMigration, splitTopLevelStatements } = require('../src/database/runMigrations');

assert.strictEqual(hasTransactionControl(`CREATE OR REPLACE FUNCTION demo() RETURNS trigger AS $$\nBEGIN\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;`), false);
assert.strictEqual(hasTransactionControl(`DO $$\nBEGIN\n  PERFORM 1;\nEND;\n$$;`), false);
assert.strictEqual(hasTransactionControl(`BEGIN;\nALTER TABLE demo ADD COLUMN x integer;\nCOMMIT;`), true);
assert.strictEqual(hasTransactionControl(`-- BEGIN;\nSELECT 'COMMIT;';`), false);
assert.strictEqual(isNoTransactionMigration(`-- propulse:no-transaction\nCREATE INDEX CONCURRENTLY demo_idx ON demo(id);`), true);
assert.strictEqual(isNoTransactionMigration(`CREATE INDEX demo_idx ON demo(id);`), false);
const split=splitTopLevelStatements(`-- propulse:no-transaction\nCREATE INDEX CONCURRENTLY a ON demo(id);\nCREATE INDEX CONCURRENTLY b ON demo((lower('x;y')));`);
assert.strictEqual(split.length,2);
assert.match(split[0],/INDEX CONCURRENTLY a/);
assert.match(split[1],/INDEX CONCURRENTLY b/);

console.log('Migration transaction detection regression test passed.');
