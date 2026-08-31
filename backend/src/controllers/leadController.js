const leadService = require('../services/leadService');

const VALID_STATUSES = ['available', 'paused', 'sold', 'closed', 'invalid'];

async function createLead(req, res) {
  try {
    const {
      industryId,
      serviceId,
      subserviceId,
      stateId,
      cityId,
      customerName,
      customerPhone,
      customerEmail,
      requirement,
      propertyType,
      budget,
      source,
      notes,
    } = req.body;

    if (!industryId || !serviceId || !stateId || !cityId || !customerName || !customerPhone || !requirement) {
      return res.status(400).json({
        error: 'Industry, service, state, city, customer name, customer phone and requirement are required',
      });
    }

    const lead = await leadService.createLead({
      industryId,
      serviceId,
      subserviceId,
      stateId,
      cityId,
      customerName,
      customerPhone,
      customerEmail,
      requirement,
      propertyType,
      budget,
      source,
      notes,
      createdBy: req.user?.id,
    });

    return res.status(201).json(lead);
  } catch (error) {
    console.error('Create lead failed:', error.message);
    return res.status(500).json({ error: 'Failed to create lead' });
  }
}

async function getLeads(req, res) {
  try {
    const leads = await leadService.getLeads({
      industryId: req.query.industryId,
      serviceId: req.query.serviceId,
      subserviceId: req.query.subserviceId,
      stateId: req.query.stateId,
      cityId: req.query.cityId,
      status: req.query.status || 'available',
      userId: req.user?.id,
      role: req.user?.role,
    });

    return res.json(leads);
  } catch (error) {
    console.error('Get leads failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
}

async function getLeadById(req, res) {
  try {
    const lead = await leadService.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json(lead);
  } catch (error) {
    console.error('Get lead failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch lead' });
  }
}

async function updateLead(req, res) {
  try {
    const { id } = req.params;
    const {
      industryId,
      serviceId,
      subserviceId,
      stateId,
      cityId,
      customerName,
      customerPhone,
      customerEmail,
      requirement,
      propertyType,
      budget,
      source,
      status,
      notes,
    } = req.body;

    if (!industryId || !serviceId || !stateId || !cityId || !customerName || !customerPhone || !requirement) {
      return res.status(400).json({
        error: 'Industry, service, state, city, customer name, customer phone and requirement are required',
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid lead status' });
    }

    const lead = await leadService.updateLead(id, {
      industryId,
      serviceId,
      subserviceId,
      stateId,
      cityId,
      customerName,
      customerPhone,
      customerEmail,
      requirement,
      propertyType,
      budget,
      source,
      status,
      notes,
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json(lead);
  } catch (error) {
    console.error('Update lead failed:', error.message);
    return res.status(500).json({ error: 'Failed to update lead' });
  }
}

async function updateLeadStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Valid status is required',
        allowedStatuses: VALID_STATUSES,
      });
    }

    const lead = await leadService.updateLeadStatus(id, status);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json(lead);
  } catch (error) {
    console.error('Update lead status failed:', error.message);
    return res.status(500).json({ error: 'Failed to update lead status' });
  }
}

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
};
