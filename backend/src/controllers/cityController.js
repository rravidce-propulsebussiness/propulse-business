const pool = require('../config/database');
const cityService = require('../services/cityService');

async function findExistingCity({ stateId, name, slug }) {
  const result = await pool.query(
    `SELECT c.*, s.name AS state_name, s.code AS state_code
       FROM cities c
       INNER JOIN states s ON s.id = c.state_id
      WHERE c.state_id = $1
        AND c.is_active = TRUE
        AND s.is_active = TRUE
        AND (LOWER(TRIM(c.name)) = LOWER(TRIM($2)) OR LOWER(TRIM(c.slug)) = LOWER(TRIM($3)))
      ORDER BY c.id ASC
      LIMIT 1`,
    [Number(stateId), String(name || ''), String(slug || '')]
  );
  return result.rows[0] || null;
}

async function getAllCities() {
  const pageSize = 100;
  const firstPage = await cityService.getCities({ page: 1, pageSize });
  const total = firstPage.pagination?.total ?? firstPage.data.length;
  const allCities = [...firstPage.data];
  const totalPages = firstPage.pagination?.totalPages ?? Math.ceil(total / pageSize);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await cityService.getCities({ page, pageSize });
    allCities.push(...nextPage.data);
  }

  return {
    data: allCities,
    pagination: {
      page: 1,
      pageSize: allCities.length || pageSize,
      total,
      totalPages: allCities.length ? 1 : 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

async function createCity(req, res) {
  try {
    const { stateId, name, slug } = req.body;
    if (!stateId || !name || !slug) return res.status(400).json({ error: 'State ID, name and slug are required' });
    return res.status(201).json(await cityService.createCity({ stateId, name, slug }));
  } catch (error) {
    if (error.code === 'CITY_ALREADY_EXISTS') {
      try {
        const city = await findExistingCity(req.body);
        if (city) return res.status(200).json({ ...city, alreadyExists: true });
      } catch (lookupError) {
        console.error('Duplicate city lookup failed:', lookupError.message);
      }
      return res.status(409).json({ error: 'City already exists in this state', code: error.code });
    }
    if (error.code === '23505' && ['uq_cities_active_state_name', 'uq_cities_active_state_slug', 'cities_state_id_name_key', 'cities_state_id_slug_key'].includes(error.constraint)) {
      try {
        const city = await findExistingCity(req.body);
        if (city) return res.status(200).json({ ...city, alreadyExists: true });
      } catch (lookupError) {
        console.error('Duplicate city lookup failed:', lookupError.message);
      }
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
  try {
    const hasPagination = ['page', 'pageSize', 'limit'].some(key => req.query[key] !== undefined);
    return res.json(hasPagination ? await cityService.getCities(req.query) : await getAllCities());
  }
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