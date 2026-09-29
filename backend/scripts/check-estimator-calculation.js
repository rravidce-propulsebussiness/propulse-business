const assert = require('node:assert/strict');
const {
  calculateEstimateFromConfig,
  parseQuantityScaled,
  parsePercentBps,
  multiplyRate,
  applyPercent,
} = require('../src/services/estimatorService');
const { parseMoneyPaise } = require('../src/utils/money');

assert.equal(parseQuantityScaled('1'),1000n);
assert.equal(parseQuantityScaled('12.5'),12500n);
assert.equal(parsePercentBps('10.25'),1025n);
assert.equal(parsePercentBps('-5.50'),-550n);
assert.equal(multiplyRate(parseMoneyPaise('100.01'),parseQuantityScaled('3')),30003n);
assert.equal(applyPercent(parseMoneyPaise('1000.00'),parsePercentBps('10')),110000n);
assert.equal(applyPercent(parseMoneyPaise('1000.00'),parsePercentBps('-5')),95000n);

const config={
  answers:{area:'100',quality:'premium'},
  rateItems:[
    {rateKey:'base',label:'Base area rate',calculationType:'per_unit',unitQuestionKey:'area',amountMin:'100.00',amountMax:'120.00',showWhen:{},isActive:true},
    {rateKey:'premium',label:'Premium package',calculationType:'fixed',unitQuestionKey:null,amountMin:'500.00',amountMax:'500.00',showWhen:{questionKey:'quality',equals:'premium'},isActive:true},
    {rateKey:'skip',label:'Skipped rule',calculationType:'fixed',unitQuestionKey:null,amountMin:'999.00',amountMax:'999.00',showWhen:{questionKey:'quality',equals:'standard'},isActive:true},
  ],
  adjustments:[
    {adjustmentKey:'city',label:'City adjustment',adjustmentType:'percent',valueMin:'10.00',valueMax:'10.00',cityId:7,showWhen:{},isActive:true},
    {adjustmentKey:'other_city',label:'Other city',adjustmentType:'fixed',valueMin:'5000.00',valueMax:'5000.00',cityId:8,showWhen:{},isActive:true},
  ],
  cityId:7,
};
const result=calculateEstimateFromConfig(config);
assert.equal(result.minimum,11550);
assert.equal(result.maximum,13750);
assert.equal(result.breakdown.length,3);
assert.equal(result.breakdown[2].minimum,1050);
assert.equal(result.breakdown[2].maximum,1250);

const noCity=calculateEstimateFromConfig({...config,cityId:null});
assert.equal(noCity.minimum,10500);
assert.equal(noCity.maximum,12500);

const detailedMaterial=calculateEstimateFromConfig({
  answers:{area:'100',brick_spec:'karimnagar_class_i'},
  rateItems:[
    {rateKey:'base',label:'Base area rate',calculationType:'per_unit',unitQuestionKey:'area',amountMin:'100.00',amountMax:'100.00',showWhen:{},isActive:true},
  ],
  adjustments:[
    {adjustmentKey:'material_brick_spec_karimnagar_class_i',label:'Brick specification · Karimnagar Class I',adjustmentType:'fixed',valueMin:'250.00',valueMax:'400.00',cityId:null,showWhen:{questionKey:'brick_spec',equals:'karimnagar_class_i'},metadata:{kind:'material_option'},isActive:true},
    {adjustmentKey:'material_brick_spec_other',label:'Other brick',adjustmentType:'fixed',valueMin:'900.00',valueMax:'900.00',cityId:null,showWhen:{questionKey:'brick_spec',equals:'other'},metadata:{kind:'material_option'},isActive:true},
  ],
  cityId:null,
});
assert.equal(detailedMaterial.minimum,10250);
assert.equal(detailedMaterial.maximum,10400);
assert.equal(detailedMaterial.breakdown.at(-1).key,'material_brick_spec_karimnagar_class_i');

const perUnitMaterial=calculateEstimateFromConfig({
  answers:{area:'100',external_laminate_spec:'pu_duco'},
  rateItems:[
    {rateKey:'base',label:'Base area rate',calculationType:'per_unit',unitQuestionKey:'area',amountMin:'100.00',amountMax:'100.00',showWhen:{},isActive:true},
  ],
  adjustments:[
    {adjustmentKey:'material_external_laminate_spec_pu_duco',label:'PU / Duco finish',adjustmentType:'per_unit',unitQuestionKey:'area',valueMin:'350.00',valueMax:'350.00',cityId:null,showWhen:{questionKey:'external_laminate_spec',equals:'pu_duco'},metadata:{kind:'material_option'},isActive:true},
  ],
  cityId:null,
});
assert.equal(perUnitMaterial.minimum,45000);
assert.equal(perUnitMaterial.maximum,45000);
assert.equal(perUnitMaterial.breakdown.at(-1).minimum,35000);

assert.throws(()=>calculateEstimateFromConfig({answers:{},rateItems:[],adjustments:[]}),/No estimator rate applies/);
assert.throws(()=>parseQuantityScaled('1.2345'),/up to 3 decimal places/);
console.log('Estimator exact calculation regression checks passed.');
