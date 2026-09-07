const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const originalLoad = Module._load;
const queries = [];

Module._load = function(request, parent, isMain) {
  if (request === '../config/database' && parent?.filename?.endsWith(`${path.sep}cityService.js`)) {
    return {
      query: async (text, params) => {
        queries.push({ text, params });
        if (/SELECT COUNT\(\*\)/.test(text)) return { rows: [{ total: 245 }] };
        return { rows: [{ id: 1, name: 'Test Subcity' }] };
      },
    };
  }
  return originalLoad.apply(this, arguments);
};

(async () => {
  try {
    const cityService = require('../src/services/cityService');
    const result = await cityService.getSubcities({ cityId: '7', page: '3', pageSize: '500' });
    assert.equal(queries.length, 2);
    assert.equal(result.data.length, 1);
    assert.deepEqual(result.pagination, {
      page: 3,
      pageSize: 100,
      offset: 200,
      total: 245,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });
    assert.match(queries[1].text, /LIMIT \$2 OFFSET \$3/);
    assert.deepEqual(queries[1].params, ['7', 100, 200]);
    assert.match(queries[1].text, /ORDER BY s\.name ASC,c\.name ASC,sc\.name ASC,sc\.id ASC/);

    console.log('Subcity pagination regression test passed.');
  } finally {
    Module._load = originalLoad;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
