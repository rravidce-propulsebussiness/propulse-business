const stateService = require('../services/stateService');
const cityService = require('../services/cityService');
const pincodeService = require('../services/pincodeService');
const locationPincodeSyncService = require('../services/locationPincodeSyncService');

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
    let pincodeSync = null;
    let locationPincodeSync = null;
    try { pincodeSync = await pincodeService.syncPincodesForState(req.params.id); }
    catch (syncError) { console.error('State pincode sync failed:', syncError.message); }
    try { locationPincodeSync = await locationPincodeSyncService.syncPincodesForState(req.params.id); }
    catch (syncError) { console.error('State city pincode sync failed:', syncError.message); }
    const locationErrors = (locationPincodeSync || []).filter(item => item.error);
    return res.json({
      message: `Cities and PIN codes synced for ${result.state.name}`,
      ...result,
      pincode_sync: pincodeSync ? {
        pages: pincodeSync.pages,
        totalOffices: pincodeSync.totalOffices,
        totalPincodes: pincodeSync.totalPincodes,
      } : null,
      location_pincode_sync: locationPincodeSync ? {
        cities: locationPincodeSync.length,
        succeeded: locationPincodeSync.length - locationErrors.length,
        failed: locationErrors.length,
        errors: locationErrors,
      } : null,
    });
  } catch (error) { console.error('Sync state cities failed:', error.message); return res.status(502).json({ error: error.message || 'Failed to sync state cities' }); }
}

module.exports = { createState, getStates, getStateById, updateState, deactivateState, syncCities };
