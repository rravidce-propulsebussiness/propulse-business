const assert = require('node:assert/strict');
const Module = require('node:module');

const originalLoad = Module._load;
const queries = [];

Module._load = function(request, parent, isMain) {
  if (request === '../config/database' && parent?.filename?.endsWith(`${require('node:path').sep}adminService.js`)) {
    return {
      query: async (text, params) => {
        queries.push({ text, params });
        if (/SELECT COUNT\(\*\)/.test(text)) return { rows: [{ total: 250 }] };
        return { rows: [{ id: 1 }] };
      },
      connect: async () => { throw new Error('connect should not be used by getUsers'); },
    };
  }
  if (request === './profileService' && parent?.filename?.endsWith(`${require('node:path').sep}adminService.js`)) {
    return { validateSelections: async () => {} };
  }
  return originalLoad.apply(this, arguments);
};

(async () => {
  try {
    const adminService = require('../src/services/adminService');

    const result = await adminService.getUsers({ search: 'test', role: 'business', page: '3', pageSize: '500' });
    assert.equal(queries.length, 2, 'users query should use count + bounded data query');
    assert.equal(result.data.length, 1);
    assert.deepEqual(result.pagination, {
      page: 3,
      pageSize: 100,
      total: 250,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });

    const dataQuery = queries[1];
    assert.match(dataQuery.text, /LIMIT \$\d+ OFFSET \$\d+/);
    assert.equal(dataQuery.params.at(-2), 100, 'page size must be capped at 100');
    assert.equal(dataQuery.params.at(-1), 200, 'offset must be calculated from page and capped size');
    assert.match(dataQuery.text, /ORDER BY u\.created_at DESC, u\.id DESC/);

    queries.length = 0;
    const defaultResult = await adminService.getUsers({});
    assert.equal(defaultResult.pagination.page, 1);
    assert.equal(defaultResult.pagination.pageSize, 25);
    assert.equal(queries[1].params.at(-2), 25);
    assert.equal(queries[1].params.at(-1), 0);

    console.log('Admin users pagination regression test passed.');
  } finally {
    Module._load = originalLoad;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
