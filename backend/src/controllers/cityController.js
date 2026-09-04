const cityService = require('../services/cityService');

async function createCity(req, res) {
  try {
    const { stateId, name, slug } = req.body;
    if (!stateId || !name || !slug) return res.status(400).json({ error: 'State ID, name and slug are required' });
    return res.status(201).json(await cityService.createCity({ stateId, name, slug }));
  } catch (error) { console.error('Create city failed:', error.message); return res.status(500).json({ error: 'Failed to create city' }); }
}
async function getCities(req, res) {
  try { return res.json(await cityService.getCities()); }
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
async function deactivateCity(req,res){try{const city=await cityService.deactivateCity(req.params.id);return city?res.json({message:'City deactivated successfully',city}):res.status(404).json({error:'City not found'});}catch(error){console.error('Deactivate city failed:',error.message);return res.status(500).json({error:'Failed to deactivate city'});}}
module.exports={createCity,getCities,getCityById,updateCity,deactivateCity};
