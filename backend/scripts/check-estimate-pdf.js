const assert=require('node:assert/strict');
const {createPdfToken,verifyPdfToken,renderEstimatePdf}=require('../src/services/estimatePdfService');

const publicId='abcdefghijklmnopqrstuvwx';
const token=createPdfToken(publicId,600);
assert.equal(verifyPdfToken(publicId,token),true);
assert.throws(()=>verifyPdfToken(publicId,token+'x'),/invalid/i);

const pdf=renderEstimatePdf({
  publicId,
  flow:{name:'Construction Cost Estimator',config:{estimateExperience:'single',estimateLabel:'Project Estimate'}},
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
  answers:{estimate_mode:'detailed',built_up_area:'1000'},
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
  consultationTitle:'Consultation next step',
  consultationText:'Review this saved estimate with the project team before finalising drawings and specifications.',
  lead:{customer_name:'CI Customer',customer_phone:'+919123456789',customer_email:'ci@example.com'},
});
assert.ok(Buffer.isBuffer(pdf));
assert.ok(pdf.length>1000);
assert.equal(pdf.subarray(0,8).toString('ascii'),'%PDF-1.4');
assert.match(pdf.toString('ascii'),/Project Estimate/);
assert.match(pdf.toString('ascii'),/Estimate calculation/);
assert.match(pdf.toString('ascii'),/Base construction rate/);
assert.match(pdf.toString('ascii'),/TATA 550 TMT/);
assert.match(pdf.toString('ascii'),/CI Customer/);
assert.match(pdf.toString('ascii'),/Average estimate \/ sq ft/);
assert.match(pdf.toString('ascii'),/Consultation next step/);
assert.match(pdf.toString('ascii'),/Review this saved estimate/);

const roughPdf=renderEstimatePdf({
  publicId,
  flow:{name:'Construction Cost Estimator'},
  versionNo:3,
  minimum:1800000,
  maximum:2300000,
  answers:{estimate_mode:'rough'},
  answerRows:[['Which estimate do you need?','Rough estimate'],['Built-up area','1000']],
  package:{
    label:'Royal',summary:'Published package',
    details:Array.from({length:8},(_,index)=>({detailKey:'d'+index,section:'Specs',label:'Detail '+index,value:'Value '+index,isActive:true})),
  },
  breakdown:[{kind:'rate',key:'base',label:'Base rate',minimum:1800000,maximum:2300000}],
  lead:{customer_name:'Rough Customer',customer_phone:'+919123456788',customer_email:null},
});
const roughText=roughPdf.toString('ascii');
assert.match(roughText,/Rough Estimate/);
assert.match(roughText,/Package highlights/);
assert.match(roughText,/highlights only/);
assert.doesNotMatch(roughText,/Detail 7/);

console.log('Estimate PDF generation checks passed.');
