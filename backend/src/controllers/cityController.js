const cityService = require('../services/cityService');

async function createCity(req, res) {
  try {
    const { stateId, name, slug } = req.body;
    if (!stateId || !name || !slug) return res.status(400).json({ error: 'State ID, name and slug are required' });
    return res.status(201).json(await cityService.createCity({ stateId, name, slug }));
  } catch (error) {
    if (error.code === 'CITY_ALREADY_EXISTS') {
      try {
        const requestedName = String(req.body.name || '').trim().toLowerCase();
        const requestedSlug = String(req.body.slug || '').trim().toLowerCase();
        const requestedStateId = Number(req.body.stateId);
        const existing = await cityService.getCities({ page: 1, pageSize: 100 });
        const city = (existing.data || []).find(item =>
          Number(item.state_id) === requestedStateId &&
          (String(item.name || '').trim().toLowerCase() === requestedName ||
            String(item.slug || '').trim().toLowerCase() === requestedSlug)
        );
        if (city) return res.status(200).json({ ...city, alreadyExists: true });
      } catch (lookupError) {
        console.error('Duplicate city lookup failed:', lookupError.message);
      }
      return res.status(409).json({ error: 'City already exists in this state', code: error.code });
    }
    if (error.code === '23505' && ['uq_cities_active_state_name', 'uq_cities_active_state_slug', 'cities_state_id_name_key', 'cities_state_id_slug_key'].includes(error.constraint)) {
      return res.status(409).json({ error: 'City already exists in this state', code: 'CITY_ALREADY_EXISTS' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Selected state does not exist' });
    }
    console.error('Create city failed:', error.message);
    return res.status(500).json({ error: 'Failed to create city' });
  }
}

async function getCities(req, res) {
  try { return res.json(await cityService.getCities(req.query)); }
  catch (error) { console.error('Get cities failed:', error.message); return res.status(500).json({ error: 'Failed to fetch cities' }); }
}

async function getCityById(req, res) {
  try { const city=await cityService.getCityById(req.params.id); return city ? res.json(city) : res.status(404).json({error:'City not found'}); }
  catch (error) { console.error('Get city failed:', error.message); return res.status(500).json({ error: 'Failed to fetch city' }); }
}

async function updateCity(req, res) {
  try { const {stateId,name,slug}=req.body; if(!stateId||!name||!slug)return res.status(400).json({error:'State ID, name and slug are required'}); const city=await cityService.updateCity(req.params.id,{stateId,name,slug}); return city?res.json(city):res.status(404).json({error:'City not found'}); }
  catch(error){console.error('Update city failed:',error.message);return res.status(500).json({error:'Failed to update city'});}
}

async function deactivateCity(req,res){try{const city=await cityService.deactivateCity(req.params.id);return city?res.json({message:'City deactivated successfully',city}):res.status(404).json({error:'City not found'});}catch(error){console.error('Deactivate city failed:',error.message);return res.status(500).json({error:'Failed to fetch city'});}}

module.exports={createCity,getCities,getCityById,updateCity,deactivateCity};
