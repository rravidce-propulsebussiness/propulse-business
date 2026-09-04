const stateService = require('../services/stateService');
const cityService = require('../services/cityService');

async function createState(req, res) {
  try {
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ error: 'State name is required' });
    const state = await stateService.createState({ name, code });
    let citySync = null;
    try { citySync = await cityService.syncCitiesForState(state.id); } catch (syncError) { console.error('Auto city sync failed:', syncError.message); }
    return res.status(201).json({ ...state, city_sync: citySync ? { added: citySync.added, restored: citySync.restored, skipped: citySync.skipped, total: citySync.totalFromProvider } : null });
  } catch (error) { console.error('Create state failed:', error.message); return res.status(500).json({ error: 'Failed to create state' }); }
}

async function getStates(req, res) {
  try { return res.json(await stateService.getStates()); }
  catch (error) { console.error('Get states failed:', error.message); return res.status(500).json({ error: 'Failed to fetch states' }); }
}

async function getStateById(req, res) {
  try { const state = await stateService.getStateById(req.params.id); return state ? res.json(state) : res.status(404).json({ error: 'State not found' }); }
  catch (error) { console.error('Get state failed:', error.message); return res.status(500).json({ error: 'Failed to fetch state' }); }
}

async function updateState(req, res) {
  try {
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ error: 'State name is required' });
    const state = await stateService.updateState(req.params.id, { name, code });
    return state ? res.json(state) : res.status(404).json({ error: 'State not found' });
  } catch (error) { console.error('Update state failed:', error.message); return res.status(500).json({ error: 'Failed to update state' }); }
}

async function deactivateState(req, res) {
  try { const state = await stateService.deactivateState(req.params.id); return state ? res.json({ message: 'State deactivated successfully', state }) : res.status(404).json({ error: 'State not found' }); }
  catch (error) { console.error('Deactivate state failed:', error.message); return res.status(500).json({ error: 'Failed to deactivate state' }); }
}

async function syncCities(req, res) {
  try {
    const result = await cityService.syncCitiesForState(req.params.id);
    if (!result) return res.status(404).json({ error: 'State not found' });
    return res.json({ message: `Cities synced for ${result.state.name}`, ...result });
  } catch (error) { console.error('Sync state cities failed:', error.message); return res.status(502).json({ error: error.message || 'Failed to sync state cities' }); }
}

module.exports = { createState, getStates, getStateById, updateState, deactivateState, syncCities };
