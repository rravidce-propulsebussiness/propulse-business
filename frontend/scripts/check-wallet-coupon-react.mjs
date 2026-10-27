import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8')
const wallet=read('src/pages/Wallet.jsx')
const css=read('src/pages/WalletV2.css')
const app=read('src/App.jsx')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}

assert(!wallet.includes('walletCouponEnhancer'), 'Wallet must not import the legacy DOM enhancer')
assert(!wallet.includes('MutationObserver'), 'Wallet coupon UI must use React lifecycle instead of MutationObserver')
assert(wallet.includes("authRequest('/coupons/offers?purchaseType=wallet_topup')"), 'Wallet must load eligible public offers through the coupon API')
assert(wallet.includes("authRequest('/coupons/validate'"), 'Wallet must validate coupon codes through the coupon API')
assert(wallet.includes('wallet-public-offer-card'), 'Wallet must render public offer cards in React')
assert(wallet.includes('fullyDiscounted'), 'Wallet must preserve zero-payment coupon handling')
assert(css.includes('.wallet-public-offers{')&&css.includes('.wallet-coupon-summary{'), 'Wallet coupon styles must live in the wallet stylesheet')


assert(!wallet.includes(String.raw`disabled={submitting}/>}\n      {paymentMode`), 'Wallet must not render a literal backslash-n between payment method and receiving details')
assert(!wallet.includes('placeholder="e.g. 1000" autoFocus'), 'Top-up modal must not automatically scroll down to the amount field when opened')
assert(wallet.includes('aria-labelledby="wallet-add-title"'), 'Top-up modal needs an accessible title')
assert(!app.includes('<SoundControl/>')&&!app.includes("import SoundControl"), 'The floating sound icon must not mount sitewide')
assert(css.includes('/* Mobile wallet top-up: keep the dialog and payment details within the visual viewport. */'), 'Mobile wallet modal sizing rules must exist')
assert(css.includes('box-sizing:border-box!important')&&css.includes('max-height:calc(100dvh - 20px)!important'), 'Mobile wallet modal must account for padding and viewport height')
assert(css.includes('.wallet-add-modal .wallet-receiving-grid{\n    grid-template-columns:minmax(0,1fr)!important;'), 'Mobile receiving account details must stack in one column')

console.log('React wallet coupon regression checks passed.')
