const industryService = require('../services/industryService');

async function createIndustry(req, res) {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: 'Name and slug are required',
      });
    }

    const industry = await industryService.createIndustry({
      name,
      slug,
      description,
    });

    return res.status(201).json(industry);
  } catch (error) {
    console.error('Create industry failed:', error.message);
    return res.status(500).json({ error: 'Failed to create industry' });
  }
}

async function getIndustries(req, res) {
  try {
    const industries = await industryService.getIndustries();
    return res.json(industries);
  } catch (error) {
    console.error('Get industries failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch industries' });
  }
}

async function getIndustryById(req, res) {
  try {
    const { id } = req.params;
    const industry = await industryService.getIndustryById(id);

    if (!industry) {
      return res.status(404).json({ error: 'Industry not found' });
    }

    return res.json(industry);
  } catch (error) {
    console.error('Get industry failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch industry' });
  }
}

async function updateIndustry(req, res) {
  try {
    const { id } = req.params;
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: 'Name and slug are required',
      });
    }

    const industry = await industryService.updateIndustry(id, {
      name,
      slug,
      description,
    });

    if (!industry) {
      return res.status(404).json({ error: 'Industry not found' });
    }

    return res.json(industry);
  } catch (error) {
    console.error('Update industry failed:', error.message);
    return res.status(500).json({ error: 'Failed to update industry' });
  }
}

async function deactivateIndustry(req, res) {
  try {
    const { id } = req.params;
    const industry = await industryService.deactivateIndustry(id);

    if (!industry) {
      return res.status(404).json({ error: 'Industry not found' });
    }

    return res.json({
      message: 'Industry deactivated successfully',
      industry,
    });
  } catch (error) {
    console.error('Deactivate industry failed:', error.message);
    return res.status(500).json({ error: 'Failed to deactivate industry' });
  }
}

module.exports = {
  createIndustry,
  getIndustries,
  getIndustryById,
  updateIndustry,
  deactivateIndustry,
};
