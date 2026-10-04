const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(v,m)=>{if(!v)throw new Error(m)};

const migration=read('src/database/migrations/20260928_google_sheet_sync_settings.sql');
const settings=read('src/services/sheetSyncSettingsService.js');
const adminScheduler=read('src/services/adminGoogleSheetSyncScheduler.js');
const partnerScheduler=read('src/services/leadPartnerSheetSyncScheduler.js');
const registry=read('src/services/backgroundJobRegistryService.js');
const routes=read('src/routes/leadRoutes.js');
const controller=read('src/controllers/leadController.js');
const adminPage=read('../frontend/src/admin/pages/AdminLeadSheets.jsx');
const controls=read('../frontend/src/admin/pages/SheetAutomationControls.jsx');
const adminSheets=read('../frontend/src/admin/pages/GoogleSheetAutoSync.jsx');
const partnerPage=read('../frontend/src/pages/LeadPartnerInventory.jsx');

assert(migration.includes('CREATE TABLE IF NOT EXISTS google_sheet_sync_settings'),'Google Sheet sync settings table is missing');
assert(migration.includes('interval_minutes INTEGER NOT NULL DEFAULT 5'),'Default sheet sync interval must remain five minutes');
assert(settings.includes('google_sheet_sync.settings_update'),'Sync-setting changes must be audited');
assert(settings.includes('intervalRaw<MIN_INTERVAL_MINUTES')&&settings.includes('intervalRaw>MAX_INTERVAL_MINUTES'),'Sync interval must be bounded');
assert(settings.includes('admin_sources_enabled')&&settings.includes('lead_partner_sources_enabled'),'Admin must control Admin and Lead Partner automation separately');
assert(adminScheduler.includes('sheetSyncSettings.getConfig()'),'Admin scheduler must read database-backed settings');
assert(partnerScheduler.includes('sheetSyncSettings.getConfig()'),'Lead Partner scheduler must read database-backed settings');
assert(adminScheduler.includes('SCHEDULER_TICK_MS=60*1000'),'Admin scheduler must react to settings within one minute');
assert(partnerScheduler.includes('SCHEDULER_TICK_MS = 60 * 1000'),'Lead Partner scheduler must react to settings within one minute');
assert(adminScheduler.includes("source!=='manual'")&&partnerScheduler.includes("source!=='manual'"),'Manual sync must remain available while scheduled sync is paused');
assert(registry.includes('sheetSyncSettings.getConfig()'),'Background Job Control must use the configured sheet interval');
assert(routes.includes("router.get('/google-sheet/settings'")&&routes.includes("router.put('/google-sheet/settings'"),'Admin sheet settings routes are missing');
assert(controller.includes('getGoogleSheetSyncSettings')&&controller.includes('updateGoogleSheetSyncSettings'),'Admin sheet settings controllers are missing');
assert(adminPage.includes('<SheetAutomationControls/>'),'Admin Google Sheets page must expose automation controls');
assert(controls.includes('Master automatic sync')&&controls.includes('Sync Admin Sheets Now')&&controls.includes('Sync Lead Partner Sheets Now'),'Admin automation UI is incomplete');
assert(controls.includes('Save Automation Settings'),'Admin must explicitly save schedule changes');
assert(adminSheets.includes('Admin-controlled schedule'),'Admin connection copy must not promise a fixed five-minute schedule');
assert(partnerPage.includes('Automatic sync schedule managed by Admin'),'Lead Partner UI must reflect Admin-managed scheduling');

console.log('Admin-controlled Google Sheet sync regression test passed.');
