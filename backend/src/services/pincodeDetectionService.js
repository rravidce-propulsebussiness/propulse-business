const pool = require('../config/database');

const INDIA_POST_LOOKUP = 'https://api.postalpincode.in/pincode/';
const MAX_INDIA_POST_BYTES = 256 * 1024;

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizePincode(value) {
  const pin = String(value || '').trim();
  return /^\d{6}$/.test(pin) ? pin : null;
}

async function readResponseTextLimited(response, maxBytes) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, total).toString('utf8');
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
}

async function fetchIndiaPost(pincode) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${INDIA_POST_LOOKUP}${encodeURIComponent(pincode)}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_INDIA_POST_BYTES) {
      throw new Error('India Post returned an unexpectedly large response');
    }
    if (!response.ok) throw new Error(`India Post lookup failed (HTTP ${response.status})`);
    const body = await readResponseTextLimited(response, MAX_INDIA_POST_BYTES);
    if (body === null) throw new Error('India Post returned an unexpectedly large response');
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error('India Post returned an invalid response');
    }
    const first = Array.isArray(payload) ? payload[0] : payload;
    const offices = Array.isArray(first?.PostOffice) ? first.PostOffice : [];
    if (!offices.length) {
      const error = new Error('PIN not found in India Post directory');
      error.code = 'PIN_NOT_FOUND';
      throw error;
    }
    return offices;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('India Post lookup timed out');
      timeoutError.code = 'PIN_LOOKUP_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getStoredPin(pincode) {
  return (await pool.query(
    `SELECT pincode,state_id,state_name,district_name,office_count,source,synced_at,
            postal_areas,postal_data,detected_at
       FROM india_pincodes
      WHERE pincode=$1 AND is_active=TRUE`,
    [pincode]
  )).rows[0] || null;
}

async function findSafeCityMatch({ stateName, districtName, officeNames }) {
  const names = [...new Set((officeNames || []).map(normalizeText).filter(Boolean))];
  if (!stateName) return { status: 'NO_MATCH', candidates: [] };

  const result = await pool.query(
    `SELECT DISTINCT c.id,c.name,c.state_id,s.name AS state_name
       FROM cities c
       JOIN states s ON s.id=c.state_id
       LEFT JOIN subcities sc
         ON sc.city_id=c.id AND sc.is_active=TRUE
      WHERE c.is_active=TRUE
        AND s.is_active=TRUE
        AND LOWER(TRIM(s.name))=LOWER(TRIM($1))
        AND (
          EXISTS (
            SELECT 1
              FROM unnest($2::text[]) AS office_name
             WHERE regexp_replace(LOWER(TRIM(office_name)), '[^a-z0-9]+', '', 'g')
                   = regexp_replace(LOWER(TRIM(c.name)), '[^a-z0-9]+', '', 'g')
                OR regexp_replace(LOWER(TRIM(office_name)), '[^a-z0-9]+', '', 'g')
                   = regexp_replace(LOWER(TRIM(COALESCE(sc.name,''))), '[^a-z0-9]+', '', 'g')
          )
          OR (
            NULLIF(regexp_replace(LOWER(TRIM($3)), '[^a-z0-9]+', '', 'g'),'') IS NOT NULL
            AND regexp_replace(LOWER(TRIM($3)), '[^a-z0-9]+', '', 'g')
                = regexp_replace(LOWER(TRIM(c.name)), '[^a-z0-9]+', '', 'g')
          )
        )
      ORDER BY c.id`,
    [stateName, names, districtName || '']
  );

  const unique = [];
  const seen = new Set();
  for (const row of result.rows) {
    if (!seen.has(Number(row.id))) {
      seen.add(Number(row.id));
      unique.push(row);
    }
  }

  if (unique.length === 1) return { status: 'AUTO_MAPPED', city: unique[0], candidates: unique };
  if (unique.length === 0) return { status: 'NO_MATCH', candidates: [] };
  return { status: 'NEEDS_MAPPING', candidates: unique };
}

async function savePinDirectory({ pincode, offices, source = 'india-post' }) {
  const first = offices[0] || {};
  const stateName = String(first.State || '').trim() || null;
  const districtName = String(first.District || '').trim() || null;
  const postalAreas = [...new Set(offices.map(x => String(x.Name || '').trim()).filter(Boolean))];
  const postalData = offices.map(x => ({
    name: x.Name || null,
    branchType: x.BranchType || null,
    deliveryStatus: x.DeliveryStatus || null,
    circle: x.Circle || null,
    district: x.District || null,
    division: x.Division || null,
    region: x.Region || null,
    state: x.State || null,
    block: x.Block || null,
    country: x.Country || null,
    pincode: x.Pincode || pincode,
  }));

  const stateRow = stateName
    ? (await pool.query(
        'SELECT id FROM states WHERE is_active=TRUE AND LOWER(TRIM(name))=LOWER(TRIM($1)) LIMIT 1',
        [stateName]
      )).rows[0]
    : null;

  const existing = await getStoredPin(pincode);
  if (existing) {
    const updated = await pool.query(
      `UPDATE india_pincodes
          SET state_id=COALESCE($1,state_id),
              state_name=COALESCE($2,state_name),
              district_name=COALESCE($3,district_name),
              office_count=$4,
              source=$5,
              synced_at=CURRENT_TIMESTAMP,
              postal_areas=$6::jsonb,
              postal_data=$7::jsonb,
              detected_at=COALESCE(detected_at,CURRENT_TIMESTAMP)
        WHERE pincode=$8
        RETURNING pincode,state_id,state_name,district_name,office_count,source,synced_at,postal_areas,postal_data,detected_at`,
      [
        stateRow?.id || null,
        stateName,
        districtName,
        offices.length,
        source,
        JSON.stringify(postalAreas),
        JSON.stringify(postalData),
        pincode,
      ]
    );
    return updated.rows[0];
  }

  const inserted = await pool.query(
    `INSERT INTO india_pincodes
      (pincode,state_id,state_name,district_name,office_count,source,synced_at,postal_areas,postal_data,detected_at,is_active)
     VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP,$7::jsonb,$8::jsonb,CURRENT_TIMESTAMP,TRUE)
     RETURNING pincode,state_id,state_name,district_name,office_count,source,synced_at,postal_areas,postal_data,detected_at`,
    [
      pincode,
      stateRow?.id || null,
      stateName,
      districtName,
      offices.length,
      source,
      JSON.stringify(postalAreas),
      JSON.stringify(postalData),
    ]
  );
  return inserted.rows[0];
}

async function mapPinToCity(pincode, cityId, mappingSource = 'manual') {
  const pin = normalizePincode(pincode);
  const city = Number(cityId);
  if (!pin) {
    const error = new Error('Pincode must be 6 digits');
    error.code = 'INVALID_PINCODE';
    throw error;
  }
  if (!Number.isInteger(city) || city <= 0) {
    const error = new Error('City ID must be valid');
    error.code = 'INVALID_CITY';
    throw error;
  }

  const pinRow = await getStoredPin(pin);
  if (!pinRow) {
    const error = new Error('PIN is not in the directory. Detect the PIN first.');
    error.code = 'PIN_NOT_DETECTED';
    throw error;
  }

  const cityRow = (await pool.query(
    `SELECT c.id,c.name,c.state_id,s.name AS state_name
       FROM cities c JOIN states s ON s.id=c.state_id
      WHERE c.id=$1 AND c.is_active=TRUE AND s.is_active=TRUE`,
    [city]
  )).rows[0];
  if (!cityRow) {
    const error = new Error('Selected city does not exist');
    error.code = 'CITY_NOT_FOUND';
    throw error;
  }

  if (pinRow.state_name && normalizeText(pinRow.state_name) !== normalizeText(cityRow.state_name)) {
    const error = new Error('Selected city belongs to a different state than the PIN');
    error.code = 'CITY_STATE_MISMATCH';
    throw error;
  }

  await pool.query(
    `INSERT INTO city_pincodes(city_id,pincode,office_name,is_active)
     VALUES($1,$2,$3,TRUE)
     ON CONFLICT(city_id,pincode) DO UPDATE
       SET office_name=COALESCE(EXCLUDED.office_name,city_pincodes.office_name),
           is_active=TRUE,
           updated_at=CURRENT_TIMESTAMP`,
    [city, pin, cityRow.name]
  );

  const updatedLeads = await pool.query(
    `UPDATE leads
        SET city_id=$1, state_id=COALESCE(state_id,$2), updated_at=CURRENT_TIMESTAMP
      WHERE pincode=$3 AND city_id IS NULL
      RETURNING id`,
    [city, cityRow.state_id, pin]
  );

  return {
    pincode: pin,
    city: cityRow,
    mappingSource,
    updatedLeadCount: updatedLeads.rowCount,
  };
}

async function detectPincode(pincode, { forceRefresh = false } = {}) {
  const pin = normalizePincode(pincode);
  if (!pin) {
    const error = new Error('Pincode must be 6 digits');
    error.code = 'INVALID_PINCODE';
    throw error;
  }

  const existing = await getStoredPin(pin);
  let directory = existing;
  if (!existing || forceRefresh || !Array.isArray(existing.postal_areas) || !existing.postal_areas.length) {
    const offices = await fetchIndiaPost(pin);
    directory = await savePinDirectory({ pincode: pin, offices });
  }

  const officeNames = Array.isArray(directory.postal_areas)
    ? directory.postal_areas
    : Array.isArray(directory.postal_data)
      ? directory.postal_data.map(x => x.name).filter(Boolean)
      : [];

  const mapped = await pool.query(
    'SELECT DISTINCT c.id,c.name,c.state_id,s.name AS state_name FROM city_pincodes cp JOIN cities c ON c.id=cp.city_id AND c.is_active=TRUE JOIN states s ON s.id=c.state_id AND s.is_active=TRUE WHERE cp.pincode=$1 AND cp.is_active=TRUE ORDER BY c.id',
    [pin]
  );
  if (mapped.rows.length === 1) {
    return {
      ...directory,
      status: 'MANUALLY_MAPPED',
      city: mapped.rows[0],
      candidates: mapped.rows,
      mapping: { pincode: pin, city: mapped.rows[0], mappingSource: 'existing' },
    };
  }
  const match = await findSafeCityMatch({
    stateName: directory.state_name,
    districtName: directory.district_name,
    officeNames,
  });

  let mapping = null;
  if (match.status === 'AUTO_MAPPED') {
    mapping = await mapPinToCity(pin, match.city.id, 'auto-safe-match');
  }

  return {
    ...directory,
    status: match.status,
    city: match.city || null,
    candidates: match.candidates,
    mapping,
  };
}

async function listUnmappedPins({ limit = 100 } = {}) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
  const result = await pool.query(
    `SELECT p.pincode,p.state_id,p.state_name,p.district_name,p.office_count,
            p.postal_areas,p.detected_at,
            COALESCE(
              json_agg(json_build_object('id',c.id,'name',c.name) ORDER BY c.name)
              FILTER (WHERE c.id IS NOT NULL),'[]'::json
            ) AS mapped_cities
       FROM india_pincodes p
       LEFT JOIN city_pincodes cp ON cp.pincode=p.pincode AND cp.is_active=TRUE
       LEFT JOIN cities c ON c.id=cp.city_id AND c.is_active=TRUE
      WHERE p.is_active=TRUE
      GROUP BY p.pincode,p.state_id,p.state_name,p.district_name,p.office_count,p.postal_areas,p.detected_at
      HAVING COUNT(c.id)=0
      ORDER BY p.detected_at DESC NULLS LAST,p.pincode
      LIMIT $1`,
    [safeLimit]
  );
  return result.rows;
}

module.exports = {
  detectPincode,
  mapPinToCity,
  listUnmappedPins,
  fetchIndiaPost,
};
