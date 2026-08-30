const cityService = require('../services/cityService');

async function createCity(req, res) {
  try {
    const { stateId, name, slug } = req.body;

    if (!stateId || !name || !slug) {
      return res.status(400).json({
        error: 'State ID, name and slug are required',
      });
    }

    const city = await cityService.createCity({ stateId, name, slug });
    return res.status(201).json(city);
  } catch (error) {
    console.error('Create city failed:', error.message);
    return res.status(500).json({ error: 'Failed to create city' });
  }
}

async function getCities(req, res) {
  try {
    const cities = await cityService.getCities();
    return res.json(cities);
  } catch (error) {
    console.error('Get cities failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch cities' });
  }
}

async function getCityById(req, res) {
  try {
    const { id } = req.params;
    const city = await cityService.getCityById(id);

    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }

    return res.json(city);
  } catch (error) {
    console.error('Get city failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch city' });
  }
}

async function updateCity(req, res) {
  try {
    const { id } = req.params;
    const { stateId, name, slug } = req.body;

    if (!stateId || !name || !slug) {
      return res.status(400).json({
        error: 'State ID, name and slug are required',
      });
    }

    const city = await cityService.updateCity(id, { stateId, name, slug });

    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }

    return res.json(city);
  } catch (error) {
    console.error('Update city failed:', error.message);
    return res.status(500).json({ error: 'Failed to update city' });
  }
}

async function deactivateCity(req, res) {
  try {
    const { id } = req.params;
    const city = await cityService.deactivateCity(id);

    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }

    return res.json({
      message: 'City deactivated successfully',
      city,
    });
  } catch (error) {
    console.error('Deactivate city failed:', error.message);
    return res.status(500).json({ error: 'Failed to deactivate city' });
  }
}

module.exports = {
  createCity,
  getCities,
  getCityById,
  updateCity,
  deactivateCity,
};
