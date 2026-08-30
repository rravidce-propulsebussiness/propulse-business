const serviceService = require('../services/serviceService');

async function createService(req, res) {
  try {
    const { industryId, name, slug, description } = req.body;

    if (!industryId || !name || !slug) {
      return res.status(400).json({
        error: 'Industry ID, name and slug are required',
      });
    }

    const service = await serviceService.createService({
      industryId,
      name,
      slug,
      description,
    });

    return res.status(201).json(service);
  } catch (error) {
    console.error('Create service failed:', error.message);
    return res.status(500).json({ error: 'Failed to create service' });
  }
}

async function getServices(req, res) {
  try {
    const services = await serviceService.getServices();
    return res.json(services);
  } catch (error) {
    console.error('Get services failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch services' });
  }
}

async function getServiceById(req, res) {
  try {
    const { id } = req.params;
    const service = await serviceService.getServiceById(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.json(service);
  } catch (error) {
    console.error('Get service failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch service' });
  }
}

async function updateService(req, res) {
  try {
    const { id } = req.params;
    const { industryId, name, slug, description } = req.body;

    if (!industryId || !name || !slug) {
      return res.status(400).json({
        error: 'Industry ID, name and slug are required',
      });
    }

    const service = await serviceService.updateService(id, {
      industryId,
      name,
      slug,
      description,
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.json(service);
  } catch (error) {
    console.error('Update service failed:', error.message);
    return res.status(500).json({ error: 'Failed to update service' });
  }
}

async function deactivateService(req, res) {
  try {
    const { id } = req.params;
    const service = await serviceService.deactivateService(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.json({
      message: 'Service deactivated successfully',
      service,
    });
  } catch (error) {
    console.error('Deactivate service failed:', error.message);
    return res.status(500).json({ error: 'Failed to deactivate service' });
  }
}

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deactivateService,
};
