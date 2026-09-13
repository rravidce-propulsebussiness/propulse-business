const service = require('../services/investorPayoutAccountService')

async function get(req,res){
  try { return res.json(await service.get(req.user.id)) }
  catch(e){ console.error('Payout account load failed:',e); return res.status(500).json({error:'Failed to load payout account'}) }
}

async function save(req,res){
  try {
    const account = await service.save({userId:req.user.id,...req.body})
    return res.status(201).json(account)
  } catch(e){
    const status = e.code === 'INVALID_PAYOUT_ACCOUNT' ? 400 : 500
    return res.status(status).json({error:e.message || 'Failed to save payout account',code:e.code})
  }
}

module.exports = { get, save }
