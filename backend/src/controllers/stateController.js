const stateService = require('../services/stateService');

async function createState(req, res) {
  try {
    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'State name is required',
      });
    }

    const state = await stateService.createState({ name, code });
    return res.status(201).json(state);
  } catch (error) {
    console.error('Create state failed:', error.message);
    return res.status(500).json({ error: 'Failed to create state' });
  }
}

async function getStates(req, res) {
  try {
    const states = await stateService.getStates();
    return res.json(states);
  } catch (error) {
    console.error('Get states failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch states' });
  }
}

async function getStateById(req, res) {
  try {
    const { id } = req.params;
    const state = await stateService.getStateById(id);

    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }

    return res.json(state);
  } catch (error) {
    console.error('Get state failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch state' });
  }
}

async function updateState(req, res) {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'State name is required',
      });
    }

    const state = await stateService.updateState(id, { name, code });

    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }

    return res.json(state);
  } catch (error) {
    console.error('Update state failed:', error.message);
    return res.status(500).json({ error: 'Failed to update state' });
  }
}

async function deactivateState(req, res) {
  try {
    const { id } = req.params;
    const state = await stateService.deactivateState(id);

    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }

    return res.json({
      message: 'State deactivated successfully',
      state,
    });
  } catch (error) {
    console.error('Deactivate state failed:', error.message);
    return res.status(500).json({ error: 'Failed to deactivate state' });
  }
}

module.exports = {
  createState,
  getStates,
  getStateById,
  updateState,
  deactivateState,
};
