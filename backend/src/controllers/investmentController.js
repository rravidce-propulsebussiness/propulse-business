const service = require('../services/investmentService');

async function access(req, res) {
  try { return res.json(await service.getInvestmentAccess(req.user.id)); }
  catch (e) { return res.status(500).json({ error: 'Failed to load investment access' }); }
}
async function rules(req, res) {
  try { return res.json(await service.getRules()); }
  catch (e) { return res.status(500).json({ error: 'Failed to load investment rules' }); }
}
async function locationRules(req, res) {
  try { return res.json(await service.getLocationRules()); }
  catch (e) { return res.status(500).json({ error: 'Failed to load investment location rules' }); }
}
async function create(req, res) {
  try {
    return res.status(201).json(await service.createInvestment({
      userId: req.user.id,
      industryId: Number(req.body.industryId),
      stateId: req.body.stateId == null || req.body.stateId === '' ? null : Number(req.body.stateId),
      cityId: req.body.cityId == null || req.body.cityId === '' ? null : Number(req.body.cityId),
      amount: req.body.amount,
    }));
  } catch (e) {
    const map = {
      PRO_REQUIRED: 403,
      INVESTMENT_DISABLED: 403,
      AMOUNT_OUT_OF_RANGE: 400,
      INDUSTRY_UNAVAILABLE: 400,
      INDUSTRY_LIMIT_REACHED: 400,
      CAPACITY_REACHED: 409,
      LOCATION_REQUIRED: 400,
      LOCATION_UNAVAILABLE: 400,
      LOCATION_CAPACITY_REACHED: 409,
      INSUFFICIENT_BALANCE: 400,
    };
    return res.status(map[e.code] || 400).json({ error: e.message, code: e.code });
  }
}
async function mine(req, res) {
  try { return res.json(await service.getMyInvestments(req.user.id)); }
  catch (e) { return res.status(500).json({ error: 'Failed to load investments' }); }
}
async function reinvest(req, res) {
  try {
    return res.status(201).json(await service.reinvestInvestment({
      userId: req.user.id,
      investmentId: Number(req.params.id),
    }));
  } catch (e) {
    const map = {
      NOT_FOUND: 404,
      NOT_SETTLED: 400,
      REINVESTMENT_DISABLED: 400,
      NO_REALIZED_AMOUNT: 400,
      REINVESTMENT_EXISTS: 409,
      INDUSTRY_UNAVAILABLE: 400,
      REINVESTMENT_ABOVE_MAXIMUM: 400,
      CAPACITY_REACHED: 409,
      LOCATION_UNAVAILABLE: 400,
      LOCATION_CAPACITY_REACHED: 409,
      INSUFFICIENT_BALANCE: 400,
    };
    return res.status(map[e.code] || 400).json({ error: e.message, code: e.code });
  }
}
async function adminList(req, res) {
  try { return res.json(await service.adminList()); }
  catch (e) { return res.status(500).json({ error: 'Failed to load investments' }); }
}
async function payout(req, res) {
  try { return res.json(await service.adminPayout({ investmentId: Number(req.params.id), adminId: req.user.id })); }
  catch (e) {
    const map = { NOT_FOUND: 404, ALREADY_PAID: 409, NOT_MATURED: 400 };
    return res.status(map[e.code] || 400).json({ error: e.message, code: e.code });
  }
}
module.exports = { access, rules, locationRules, create, mine, reinvest, adminList, payout };
