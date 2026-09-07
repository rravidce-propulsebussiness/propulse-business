const assert = require('assert');
const { hasTransactionControl } = require('../src/database/runMigrations');

assert.strictEqual(hasTransactionControl(`CREATE OR REPLACE FUNCTION demo() RETURNS trigger AS $$\nBEGIN\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;`), false);
assert.strictEqual(hasTransactionControl(`DO $$\nBEGIN\n  PERFORM 1;\nEND;\n$$;`), false);
assert.strictEqual(hasTransactionControl(`BEGIN;\nALTER TABLE demo ADD COLUMN x integer;\nCOMMIT;`), true);
assert.strictEqual(hasTransactionControl(`-- BEGIN;\nSELECT 'COMMIT;';`), false);

console.log('Migration transaction detection regression test passed.');
