const leadPartnerService = require('../services/leadPartnerService');
const pricingService = require('../services/leadPartnerPricingService');
const payoutAccountService = require('../services/leadPartnerPayoutAccountService');

async function dashboard(req, res) {
  try { return res.json(await leadPartnerService.getDashboard(req.user.id)); }
  catch (error) { console.error('Lead Partner dashboard failed:', error.message); return res.status(500).json({ error: 'Failed to load Lead Partner dashboard' }); }
}

async function pricing(req, res) {
  try { return res.json(await pricingService.list(req.user.id, req.query || {})); }
  catch (error) { console.error('Lead Partner pricing list failed:', error.message); return res.status(500).json({ error: 'Failed to load partner pricing' }); }
}

async function updatePricing(req, res) {
  try { return res.json(await pricingService.update(req.user.id, req.params.leadId, req.body || {})); }
  catch (error) {
    const status = ['INVALID_LEAD_ID','INVALID_PRICING','INVALID_PRICING_CONFIG'].includes(error.code) ? 400 : error.code === 'NOT_FOUND' ? 404 : error.code === 'PRICING_NOT_CONFIGURED' ? 409 : 500;
    if (status === 500) console.error('Lead Partner pricing update failed:', error.message);
    return res.status(status).json({ error: error.message || 'Failed to update lead pricing', code: error.code });
  }
}

async function payoutAccount(req, res) {
  try { return res.json(await payoutAccountService.get(req.user.id)); }
  catch (error) { console.error('Lead Partner payout account load failed:', error.message); return res.status(500).json({ error: 'Failed to load payout account' }); }
}

async function savePayoutAccount(req, res) {
  try {
    return res.json(await payoutAccountService.save({ userId:req.user.id, ...(req.body || {}), ifscCode:String(req.body?.ifscCode || '').toUpperCase() }));
  } catch (error) {
    const status = error.code === 'INVALID_PARTNER_PAYOUT_ACCOUNT' ? 400 : 500;
    if (status === 500) console.error('Lead Partner payout account save failed:', error.message);
    return res.status(status).json({ error:error.message || 'Failed to save payout account', code:error.code });
  }
}

module.exports = { dashboard, pricing, updatePricing, payoutAccount, savePayoutAccount };
