const assert=require('node:assert/strict');
const {preserveSystemCustomFields}=require('../src/services/leadService');

const existing={
  _estimator:{calculationId:'saved',minimum:100,maximum:200,package:{label:'Premium'}},
  _protected_answers:{private_note:'saved'},
  _intake:{flowKey:'interior-cost-estimator'},
  source_field:'old',
  buyerCapacity:2,
};
const incoming={
  _estimator:{calculationId:'tampered'},
  _protected_answers:{private_note:'tampered'},
  _new_private:{bad:true},
  source_field:'updated',
  another_field:'allowed',
};

const merged=preserveSystemCustomFields(existing,incoming);
assert.deepEqual(merged._estimator,existing._estimator);
assert.deepEqual(merged._protected_answers,existing._protected_answers);
assert.deepEqual(merged._intake,existing._intake);
assert.equal(merged._new_private,undefined);
assert.equal(merged.source_field,'updated');
assert.equal(merged.another_field,'allowed');

console.log('Lead private metadata preservation checks passed.');
