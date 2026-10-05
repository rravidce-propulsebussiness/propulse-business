const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { getMigrationFiles, migrationFilename, hasTransactionControl, isNoTransactionMigration, splitTopLevelStatements } = require('../src/database/runMigrations');

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

assert.strictEqual(migrationFilename(path.join(__dirname,'../src/database/migrations/example.sql')),'migrations/example.sql');
const runnerSource=fs.readFileSync(path.join(__dirname,'../src/database/runMigrations.js'),'utf8');
assert.ok(runnerSource.includes("to_regclass('public.schema_migrations')"),'Migration runner must detect an existing ledger before locking');
assert.ok(runnerSource.includes('if(!pendingBeforeLock.length)'),'Migration runner must fast-path an already-current schema');
assert.ok(runnerSource.includes('advisory lock skipped'),'Migration runner must report when it skips advisory locking');

const files=getMigrationFiles();
assert.ok(files.length>2,'Migration runner must include baseline, catalog seed and dated migrations');
assert.strictEqual(path.basename(files[0]),'schema.sql','Canonical base schema must run first');
assert.strictEqual(path.basename(files[1]),'catalogSeed.sql','Canonical catalog seed must run before dated migrations');
const baseline=fs.readFileSync(files[0],'utf8');
const catalog=fs.readFileSync(files[1],'utf8');
for(const table of ['industries','users','membership_plans','memberships','leads']){
  assert.match(baseline,new RegExp('CREATE TABLE IF NOT EXISTS '+table+'\\b'),'Baseline schema must create '+table);
}
for(const value of ['Construction','Real Estate','Interior Design & Home Improvement','Hyderabad']){
  assert.ok(catalog.includes(value),'Catalog seed must contain '+value);
}

console.log('Migration transaction detection regression test passed.');
