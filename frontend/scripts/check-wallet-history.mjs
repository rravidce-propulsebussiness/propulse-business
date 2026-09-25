import assert from 'node:assert/strict'
import { buildWalletHistory, transactionTitle } from '../src/utils/walletHistory.js'

const history={
  combined:[
    {id:'wallet-1',source:'wallet',type:'debit',amount:500,payment_id:10,reference_type:'lead',reference_id:353,description:'Lead purchase',created_at:'2026-09-25T19:18:00Z'},
    {id:'direct-10',source:'direct',type:'debit',amount:250,payment_id:10,purchase_type:'lead',purchase_id:353,description:'Lead direct payment',created_at:'2026-09-25T19:18:00Z'},
    {id:'wallet-2',source:'wallet',type:'refund',amount:700,reference_type:'membership',description:'Wallet portion refunded for rejected membership',created_at:'2026-09-25T19:14:00Z'},
  ],
  leadPurchases:[
    {id:'lead-10',payment_id:10,lead_id:353,title:'we xan dicuss',property_type:'3BHK',budget:'5 - 7 LAKH',amount:500,wallet_amount:250,external_amount:250,status:'paid',created_at:'2026-09-25T19:18:00Z'}
  ]
}

const views=buildWalletHistory(history)
assert.equal(views.all.length,2,'All Transactions must collapse raw lead payment movements into one logical lead-purchase row')
assert.equal(views.lead.length,1)
assert.equal(views.wallet.length,2,'Wallet tab must retain raw wallet ledger movements for audit clarity')
assert.equal(views.all[0].displayTitle,'Lead purchase · Lead #353')
assert.equal(views.all[0].leadContext,'3BHK · 5 - 7 LAKH')
assert(!views.all.some(row=>row.displayTitle==='we xan dicuss'),'Free-text lead requirements must never become transaction titles')
assert.equal(transactionTitle(views.all[1]),'Membership refund')

console.log('Wallet history clarity and deduplication regression test passed.')
