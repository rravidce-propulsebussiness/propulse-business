import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8')
const wallet=read('src/pages/Wallet.jsx')
const css=read('src/pages/WalletV2.css')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}

assert(!wallet.includes('walletCouponEnhancer'), 'Wallet must not import the legacy DOM enhancer')
assert(!wallet.includes('MutationObserver'), 'Wallet coupon UI must use React lifecycle instead of MutationObserver')
assert(wallet.includes("authRequest('/coupons/offers?purchaseType=wallet_topup')"), 'Wallet must load eligible public offers through the coupon API')
assert(wallet.includes("authRequest('/coupons/validate'"), 'Wallet must validate coupon codes through the coupon API')
assert(wallet.includes('wallet-public-offer-card'), 'Wallet must render public offer cards in React')
assert(wallet.includes('fullyDiscounted'), 'Wallet must preserve zero-payment coupon handling')
assert(css.includes('.wallet-public-offers{')&&css.includes('.wallet-coupon-summary{'), 'Wallet coupon styles must live in the wallet stylesheet')

console.log('React wallet coupon regression checks passed.')
