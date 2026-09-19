const leadPartnerService = require('../services/leadPartnerService');
const { resolvePincode } = require('../services/pincodeService');

async function requirePincode(body) {
  const value = String(body?.pincode ?? body?.zipcode ?? '').trim();
  if (/^\d{6}$/.test(value)) return value;
  const custom = body?.customFields && typeof body.customFields === 'object' ? body.customFields : {};
  const location = body?.location ?? body?.Location ?? custom.location ?? custom.Location ?? custom.area ?? custom.Area ?? custom.locality ?? custom.Locality ?? custom.postOffice ?? custom['Post Office'] ?? '';
  const district = body?.district ?? body?.District ?? custom.district ?? custom.District ?? '';
  const resolved = await resolvePincode({ stateId: body?.stateId, cityId: body?.cityId, district, location });
  if (resolved?.pincode) return resolved.pincode;
  throw new Error('Pincode is required and must be a valid 6-digit Indian PIN, or a matching location must be provided');
}

async function apply(req, res) {
  try {
    const partner = await leadPartnerService.apply(req.user.id);
    return res.status(201).json(partner);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Lead Partner application already exists' });
    return res.status(500).json({ error: 'Failed to apply as Lead Partner' });
  }
}

async function me(req, res) {
  try {
    const partner = await leadPartnerService.getPartnerByUserId(req.user.id);
    return res.json(partner || { status: 'not_applied' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load Lead Partner status' });
  }
}

async function createLead(req, res) {
  try {
    const pincode = await requirePincode(req.body);
    const lead = await leadPartnerService.createLead({ ...req.body, pincode, userId: req.user.id });
    return res.status(201).json(lead);
  } catch (error) {
    const message = String(error?.message || '');
    if (['PARTNER_NOT_FOUND', 'PARTNER_NOT_ACTIVE'].includes(error.code)) return res.status(403).json({ error: message, code: error.code });
    if (error.code === 'DUPLICATE_LEAD' || error.code === '23505') return res.status(409).json({ error: error.message || 'Duplicate lead', code: 'DUPLICATE_LEAD', leadId: error.leadId });
    if (message === 'Industry is required' || message.startsWith('Pincode is required')) return res.status(400).json({ error: message });
    return res.status(500).json({ error: message || 'Failed to submit lead' });
  }
}

async function updateLeadPricing(req, res) { try { const result = await leadPartnerService.update(req.user.id, Number(req.params.leadId), req.body); return res.json(result); } catch (error) { if (['PARTNER_NOT_FOUND','PARTNER_NOT_ACTIVE'].includes(error.code)) return res.status(403).json({ error: error.message, code: error.code }); if (error.code === 'NOT_FOUND') return res.status(404).json({ error: error.message, code: error.code }); return res.status(400).json({ error: error.message || 'Failed to update lead pricing', code: error.code }); } }

async function myLeads(req, res) {
  try {
    return res.json(await leadPartnerService.getMyLeads(req.user.id, req.query));
  } catch (error) {
    if (['PARTNER_NOT_FOUND', 'PARTNER_NOT_ACTIVE'].includes(error.code)) return res.status(403).json({ error: error.message, code: error.code });
    return res.status(500).json({ error: 'Failed to fetch Lead Partner leads' });
  }
}

async function adminPartners(req, res) {
  try {
    return res.json(await leadPartnerService.getAdminPartners(req.query));
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to fetch Lead Partners' });
  }
}

async function adminUpdateStatus(req, res) {
  try {
    const partner = await leadPartnerService.updateStatus(Number(req.params.id), String(req.body?.status || '').trim().toLowerCase());
    if (!partner) return res.status(404).json({ error: 'Lead Partner not found' });
    return res.json(partner);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to update Lead Partner status' });
  }
}

module.exports = { apply, me, createLead, myLeads, updateLeadPricing, adminPartners, adminUpdateStatus };
