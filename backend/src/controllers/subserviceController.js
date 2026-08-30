const subserviceService = require('../services/subserviceService');

async function createSubservice(req, res) {
  try {
    const { serviceId, name, slug, description } = req.body;

    if (!serviceId || !name || !slug) {
      return res.status(400).json({
        error: 'Service ID, name and slug are required',
      });
    }

    const subservice = await subserviceService.createSubservice({
      serviceId,
      name,
      slug,
      description,
    });

    return res.status(201).json(subservice);
  } catch (error) {
    console.error('Create subservice failed:', error.message);
    return res.status(500).json({ error: 'Failed to create subservice' });
  }
}

async function getSubservices(req, res) {
  try {
    const subservices = await subserviceService.getSubservices();
    return res.json(subservices);
  } catch (error) {
    console.error('Get subservices failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch subservices' });
  }
}

async function getSubserviceById(req, res) {
  try {
    const { id } = req.params;
    const subservice = await subserviceService.getSubserviceById(id);

    if (!subservice) {
      return res.status(404).json({ error: 'Subservice not found' });
    }

    return res.json(subservice);
  } catch (error) {
    console.error('Get subservice failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch subservice' });
  }
}

async function updateSubservice(req, res) {
  try {
    const { id } = req.params;
    const { serviceId, name, slug, description } = req.body;

    if (!serviceId || !name || !slug) {
      return res.status(400).json({
        error: 'Service ID, name and slug are required',
      });
    }

    const subservice = await subserviceService.updateSubservice(id, {
      serviceId,
      name,
      slug,
      description,
    });

    if (!subservice) {
      return res.status(404).json({ error: 'Subservice not found' });
    }

    return res.json(subservice);
  } catch (error) {
    console.error('Update subservice failed:', error.message);
    return res.status(500).json({ error: 'Failed to update subservice' });
  }
}

async function deactivateSubservice(req, res) {
  try {
    const { id } = req.params;
    const subservice = await subserviceService.deactivateSubservice(id);

    if (!subservice) {
      return res.status(404).json({ error: 'Subservice not found' });
    }

    return res.json({
      message: 'Subservice deactivated successfully',
      subservice,
    });
  } catch (error) {
    console.error('Deactivate subservice failed:', error.message);
    return res.status(500).json({ error: 'Failed to deactivate subservice' });
  }
}

module.exports = {
  createSubservice,
  getSubservices,
  getSubserviceById,
  updateSubservice,
  deactivateSubservice,
};
