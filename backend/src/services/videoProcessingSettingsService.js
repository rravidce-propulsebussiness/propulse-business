const pool=require('../config/database');

// Read by the video worker (video-redactor/worker.py) for every new playback copy.
const RESOLUTIONS=[720,1080,1440];
const QUALITIES=['high','balanced','small'];
const DEFAULTS=Object.freeze({compressEnabled:false,maxResolution:1080,quality:'balanced'});

function normalize(row){
  if(!row)return{...DEFAULTS,updatedBy:null,updatedAt:null};
  return{
    compressEnabled:row.compress_enabled===true,
    maxResolution:RESOLUTIONS.includes(Number(row.max_resolution))?Number(row.max_resolution):DEFAULTS.maxResolution,
    quality:QUALITIES.includes(row.quality)?row.quality:DEFAULTS.quality,
    updatedBy:row.updated_by?Number(row.updated_by):null,
    updatedAt:row.updated_at||null
  };
}

async function getSettings(client=pool){
  const row=(await client.query('SELECT compress_enabled,max_resolution,quality,updated_by,updated_at FROM video_processing_settings WHERE id=1')).rows[0];
  return normalize(row);
}

function invalid(message){return Object.assign(new Error(message),{code:'INVALID_VIDEO_PROCESSING_SETTINGS'});}

async function updateSettings(actorId,payload={}){
  const current=await getSettings();
  const compressEnabled=typeof payload.compressEnabled==='boolean'?payload.compressEnabled:current.compressEnabled;
  const maxResolution=payload.maxResolution===undefined?current.maxResolution:Number(payload.maxResolution);
  const quality=payload.quality===undefined?current.quality:String(payload.quality);
  if(!RESOLUTIONS.includes(maxResolution))throw invalid('Maximum resolution must be 720, 1080 or 1440');
  if(!QUALITIES.includes(quality))throw invalid('Quality must be high, balanced or small');
  const row=(await pool.query(
    `INSERT INTO video_processing_settings(id,compress_enabled,max_resolution,quality,updated_by,updated_at)
     VALUES(1,$1,$2,$3,$4,CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET compress_enabled=EXCLUDED.compress_enabled,max_resolution=EXCLUDED.max_resolution,
       quality=EXCLUDED.quality,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at
     RETURNING compress_enabled,max_resolution,quality,updated_by,updated_at`,
    [compressEnabled,maxResolution,quality,actorId||null]
  )).rows[0];
  return normalize(row);
}

module.exports={RESOLUTIONS,QUALITIES,DEFAULTS,getSettings,updateSettings};
