// Guard professional-specific calculation against accidental use of the
// platform's global catalogue price or double-counting material allowances.
import assert from 'node:assert/strict'
import {calculateProfessionalPackageQuote} from '../src/utils/professionalPackageQuote.js'

const pkg=(unit,rate)=>({
  title:'Owner Standard',industry:'construction',price_unit:unit,price_from:rate,
  spec_sections:[
    {title:'Steel',brand:'Tata',grade:'Fe550D',pricingTreatment:'included'},
    {title:'Tile selection',allowanceValue:150,unit:'sqft',pricingTreatment:'allowance'},
    {title:'Solar panel',allowanceValue:50000,pricingTreatment:'extra'},
  ]
})
const sqft=calculateProfessionalPackageQuote({packageRecord:pkg('sqft',1750),areaSqft:2400,professionalName:'Sample Builder'})
assert.equal(sqft.amount,4200000)
assert.equal(sqft.packageName,'Owner Standard')
assert.equal(sqft.professionalName,'Sample Builder')
assert.equal(sqft.specifications.length,3)
assert.equal(sqft.specifications[1].allowanceValue,150)
assert.equal(sqft.specifications[2].pricingTreatment,'extra')
assert.equal(calculateProfessionalPackageQuote({packageRecord:pkg('sqyd',18000),areaSqft:900}).amount,1800000)
assert.equal(calculateProfessionalPackageQuote({packageRecord:pkg('project',550000),areaSqft:''}).amount,550000)
assert.equal(calculateProfessionalPackageQuote({packageRecord:pkg('sqft',1750),areaSqft:0}),null)
assert.equal(calculateProfessionalPackageQuote({packageRecord:pkg('room',10000),areaSqft:2}),null)
assert.equal(calculateProfessionalPackageQuote({packageRecord:pkg('sqft',0),areaSqft:2000}),null)
assert.equal(calculateProfessionalPackageQuote({packageRecord:null,areaSqft:2000}),null)
console.log('PASS: Professional package indicative quote rate, area, units, materials and extra charges')
