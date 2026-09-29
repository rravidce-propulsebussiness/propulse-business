const assert=require('node:assert/strict');
const {createPdfToken,verifyPdfToken,renderEstimatePdf}=require('../src/services/estimatePdfService');

const publicId='abcdefghijklmnopqrstuvwx';
const token=createPdfToken(publicId,600);
assert.equal(verifyPdfToken(publicId,token),true);
assert.throws(()=>verifyPdfToken(publicId,token+'x'),/invalid/i);

const pdf=renderEstimatePdf({
  publicId,
  flow:{name:'Construction Cost Estimator'},
  versionNo:2,
  minimum:2100000,
  maximum:2450000,
  createdAt:'2026-09-29T10:00:00.000Z',
  breakdown:[
    {kind:'rate',key:'base',label:'Base construction rate',minimum:2000000,maximum:2250000},
    {kind:'adjustment',key:'premium',label:'Premium specification',minimum:100000,maximum:200000},
  ],
  cityName:'Hyderabad',
  stateName:'Telangana',
  pincode:'500001',
  answers:{estimate_mode:'detailed'},
  answerRows:[
    ['Which estimate do you need?','Detailed estimate'],
    ['Built-up area','1000'],
    ['Steel specification','TATA 550 TMT'],
    ['Cement specification','UltraTech 53 grade for complete construction'],
    ['Brick specification','Karimnagar Class I brick'],
    ['Electrical wire specification','Polycab FRLS fireproof wire'],
  ],
  package:{
    label:'Royal',badge:'SIGNATURE',summary:'Higher-specification construction package.',
    priceNote:'Admin-controlled pricing',
    details:[
      {detailKey:'steel',section:'Structure',label:'Steel',value:'TATA 550 TMT',isActive:true},
      {detailKey:'cement',section:'Structure',label:'Cement',value:'UltraTech 53 grade',isActive:true},
      {detailKey:'wire',section:'Electrical',label:'Wire',value:'Polycab FRLS',isActive:true},
    ],
  },
  disclaimer:'Indicative planning estimate only.',
  lead:{customer_name:'CI Customer',customer_phone:'+919123456789',customer_email:'ci@example.com'},
});
assert.ok(Buffer.isBuffer(pdf));
assert.ok(pdf.length>1000);
assert.equal(pdf.subarray(0,8).toString('ascii'),'%PDF-1.4');
assert.match(pdf.toString('ascii'),/Detailed Estimate/);
assert.match(pdf.toString('ascii'),/Estimate calculation/);
assert.match(pdf.toString('ascii'),/Base construction rate/);
assert.match(pdf.toString('ascii'),/TATA 550 TMT/);
assert.match(pdf.toString('ascii'),/CI Customer/);

console.log('Estimate PDF generation checks passed.');
