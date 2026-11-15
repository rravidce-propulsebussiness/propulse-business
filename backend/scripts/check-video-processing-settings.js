// Project video quality switch and upload limits.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..','..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const migration=read('backend/src/database/migrations/20261115_zzz_video_processing_settings.sql');
const service=read('backend/src/services/videoProcessingSettingsService.js');
const routes=read('backend/src/routes/adminRoutes.js');
const uploads=read('backend/src/services/projectVideoService.js');
const worker=read('video-redactor/worker.py');
const workflow=read('.github/workflows/project-video-redaction.yml');
const profile=read('frontend/src/pages/Profile.jsx');
const directory=read('frontend/src/admin/pages/AdminExpertDirectory.jsx');
const card=read('frontend/src/admin/pages/AdminVideoProcessingSettings.jsx');

// 1. Original quality is the default: compression only happens after an admin turns it on.
assert(migration.includes('compress_enabled BOOLEAN NOT NULL DEFAULT FALSE'),'Compression must be off by default');
assert(migration.includes('INSERT INTO video_processing_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING'),'Default settings row must exist');
assert(/"compress": False/.test(worker),'Worker must keep original quality when settings are missing');
assert(worker.includes('except psycopg.Error:')&&worker.includes('return dict(DEFAULT_SETTINGS)'),'Unreadable settings must fall back to original quality');
assert(worker.includes('stats=transcode(original,processed,settings)'),'Worker must apply the admin setting to each new playback copy');
assert(worker.includes('compression would not reduce size'),'Compression must never make a video larger than the original');

// 2. Admin-only API.
assert(routes.includes('router.use(requireAuth,requireAdmin);'),'Admin routes must stay protected');
assert(routes.includes("router.get('/video-processing',videoProcessingSettingsController.get)"),'Admin can read video settings');
assert(routes.includes("router.put('/video-processing',rateLimit({windowMs:60000,max:20}),videoProcessingSettingsController.update)"),'Admin can save video settings');
assert(service.includes('const RESOLUTIONS=[720,1080,1440]')&&service.includes("const QUALITIES=['high','balanced','small']"),'Settings are limited to known values');
assert(directory.includes("{section==='settings'&&<AdminVideoProcessingSettings/>}"),'Video quality card belongs to Directory Settings');
assert(card.includes("authRequest('/admin/video-processing'"),'Video quality card uses the admin API');

// 3. Upload limit, worker limit and job time limit stay in step, so an accepted upload
//    is never rejected later by the worker.
const product=text=>text.split('*').reduce((total,part)=>total*Number(part.trim()),1);
const uploadBytes=product((/const DIRECT_UPLOAD_MAX_BYTES=([0-9*]+);/.exec(uploads)[1]));
const workerBytes=product((/VIDEO_REDACTOR_MAX_BYTES", str\(([0-9 *]+)\)\)/.exec(worker)[1]));
const profileBytes=product((/if\(file\.size>([0-9*]+)\)\{/.exec(profile)[1]));
assert.equal(uploadBytes,workerBytes,'Backend upload limit must equal the worker limit');
assert.equal(profileBytes,workerBytes,'Browser upload check must equal the worker limit');
const jobMinutes=Number(/timeout-minutes: (\d+)/.exec(workflow)[1]);
const reclaimMinutes=Number(/interval '(\d+) minutes'/.exec(worker)[1]);
assert(reclaimMinutes>jobMinutes,'A still-running video must not be reclaimed before the job time limit');

console.log('Video processing settings and upload limits passed.');
