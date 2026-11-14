import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { buildWalletHistory, transactionTitle } from '../src/utils/walletHistory.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const walletPage = fs.readFileSync(path.join(root, 'src/pages/Wallet.jsx'), 'utf8')
const leadsPage = fs.readFileSync(path.join(root, 'src/pages/LeadsV2.jsx'), 'utf8')
const adminUsers = fs.readFileSync(path.join(root, 'src/admin/pages/AdminUsers.jsx'), 'utf8')

const history={
  combined:[
    {id:'wallet-paid',source:'wallet',type:'debit',amount:500,balance_after:200,payment_id:10,reference_type:'lead',reference_id:353,payment_status:'paid',created_at:'2026-09-25T19:18:00Z'},
    {id:'direct-paid',source:'direct',type:'debit',amount:250,balance_after:200,payment_id:10,purchase_type:'lead',purchase_id:353,status:'paid',created_at:'2026-09-25T19:18:00Z'},
    {id:'direct-rejected-1',source:'direct',type:'debit',amount:500,balance_after:700,payment_id:20,purchase_type:'lead',purchase_id:379,status:'rejected',created_at:'2026-09-21T08:31:00Z'},
    {id:'direct-rejected-2',source:'direct',type:'debit',amount:235,balance_after:700,payment_id:21,purchase_type:'lead',purchase_id:379,status:'rejected',created_at:'2026-09-21T08:36:00Z'},
    {id:'wallet-refund',source:'wallet',type:'refund',amount:700,balance_after:700,reference_type:'membership',description:'Wallet portion refunded for rejected membership',created_at:'2026-09-25T19:14:00Z'},
    {id:'wallet-topup-credit',source:'wallet',type:'credit',amount:3000,balance_after:3700,reference_type:'wallet_topup',reference_id:7,created_at:'2026-09-26T10:00:00Z'},
    {id:'direct-topup-paid',source:'direct',type:'debit',amount:3000,balance_after:3700,payment_id:30,purchase_type:'wallet_topup',purchase_id:7,status:'paid',created_at:'2026-09-26T09:59:00Z'},
    {id:'direct-topup-pending',source:'direct',type:'debit',amount:2000,balance_after:3700,payment_id:31,purchase_type:'wallet_topup',purchase_id:8,status:'pending',created_at:'2026-09-26T11:00:00Z'},
  ],
  leadPurchases:[
    {id:'lead-10',payment_id:10,lead_id:353,title:'we xan dicuss',property_type:'3BHK',budget:'5 - 7 LAKH',amount:500,wallet_amount:250,external_amount:250,balance_after:200,status:'paid',created_at:'2026-09-25T19:18:00Z'}
  ]
}

const views=buildWalletHistory(history)
assert.equal(views.lead.length,1,'Lead Purchase tab must contain paid purchases only')
assert.equal(views.lead[0].displayTitle,'Lead purchase · Lead #353')
assert.equal(views.lead[0].balance_after,200,'Paid lead purchase must preserve historical balance')
assert(!views.all.some(row=>row.id==='direct-paid'||row.id==='wallet-paid'),'Raw movements for a paid lead must be collapsed into the logical purchase row')

const rejected379=views.all.filter(row=>String(row.purchase_id)==='379')
assert.equal(rejected379.length,1,'Repeated rejected payment attempts for the same unpurchased lead must collapse to one row')
assert.equal(rejected379[0].attemptCount,2)
assert.equal(rejected379[0].status,'rejected')
assert.equal(rejected379[0].type,'attempt','Rejected payment attempts must not render as actual debits')
assert.equal(rejected379[0].balance_after,700)
assert.equal(transactionTitle(rejected379[0]),'Lead payment rejected · Lead #379')
assert(!views.all.some(row=>row.displayTitle==='we xan dicuss'),'Free-text lead requirements must never become transaction titles')
assert.equal(transactionTitle(views.all.find(row=>row.id==='wallet-refund')),'Membership refund')

const pendingTopup=views.all.find(row=>row.id==='direct-topup-pending')
assert(pendingTopup,'A pending top-up request must stay visible')
assert.notEqual(pendingTopup.type,'debit','A top-up request must never render as a wallet debit (−₹)')
assert.equal(transactionTitle(pendingTopup),'Wallet top-up · awaiting approval')
assert(!views.all.some(row=>row.id==='direct-topup-paid'),'An approved top-up must show once, as its wallet credit')
assert(views.all.some(row=>row.id==='wallet-topup-credit'),'The approved top-up credit row must stay')
assert.equal(transactionTitle({source:'wallet',type:'credit',reference_type:'promotion',description:'Promotion BONUS20: bonus wallet balance'}),'Promotion bonus · BONUS20')
assert.equal(transactionTitle({source:'wallet',type:'debit',reference_type:'investment'}),'Investment purchase')
assert.equal(transactionTitle({source:'wallet',type:'credit',reference_type:'admin_adjustment'}),'Balance adjusted by ProPulse')

assert(walletPage.includes("authRequest('/wallet?summary=1')"), 'Wallet page must not fetch unused wallet transaction rows for the balance card')
assert(walletPage.includes("authRequest('/wallet/topups/history?summary=1')"), 'Wallet page must fetch only the top-up summary for pending request count')
assert(leadsPage.includes("authRequest('/wallet?summary=1')"), 'Lead marketplace must fetch only wallet balance data')
assert(adminUsers.includes("loadMoreWallet('recharges')") && adminUsers.includes("loadMoreWallet('transactions')"), 'Customer 360 must load older wallet history on demand')
assert(!adminUsers.includes("(wallet360?.transactions||[]).slice(0,100)"), 'Customer 360 must not fetch a larger ledger and silently hide rows client-side')

console.log('Wallet history paid-purchase, attempt-collapse, balance and summary-efficiency regression test passed.')
