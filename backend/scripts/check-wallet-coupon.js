const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '../src/controllers/walletController.js');
const source = fs.readFileSync(controllerPath, 'utf8');

if (!source.includes("const walletCouponService=require('../services/walletCouponService');")) {
  throw new Error('Wallet controller does not import walletCouponService');
}

if (!source.includes('walletCouponService.createTopupWithCoupon')) {
  throw new Error('Wallet controller coupon top-up path is missing');
}

if (!source.includes('walletService.createTopup')) {
  throw new Error('Wallet controller standard top-up path is missing');
}

require(controllerPath);

console.log('Wallet coupon controller regression test passed.');
