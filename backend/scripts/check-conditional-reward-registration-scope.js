const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const service=require('../src/services/leadEntitlementGrantService');
const source=read('src/services/leadEntitlementGrantService.js');
const editor=read('../frontend/src/admin/pages/AdminLeadEntitlements.jsx');
const migration=read('src/database/migrations/20261027_zzz_conditional_reward_registration_scope.sql');
const created='2026-10-27T00:00:00Z';
assert.equal(service.qualifiesCampaignSignup({registration_scope:'new_registration',created_at:created},'2026-10-26T23:59:59Z'),false,
  'Registrations before campaign creation must not receive signup-only rewards');
assert.equal(service.qualifiesCampaignSignup({registration_scope:'new_registration',created_at:created},'2026-10-27T00:00:00Z'),true,
  'Registrations from campaign creation onward are eligible');
assert.equal(service.qualifiesCampaignSignup({registration_scope:'any',created_at:created},'2024-01-01T00:00:00Z'),true,
  'Anyone includes existing businesses');
assert.equal(service.qualifiesCampaignSignup({registration_scope:'new_registration',created_at:created},'invalid'),false,
  'Invalid dates must not pass a new-registration check');
assert.equal(service.qualifiesProjectSignupWindow('2026-10-16','2026-10-01','2026-10-27',15,'any'),true,
  'An anyone reward can count earlier accounts with an on-time upload');
assert.equal(service.qualifiesProjectSignupWindow('2026-10-16','2026-10-01','2026-10-27',15,'new_registration'),false,
  'New-registration project rewards must not count pre-campaign accounts');
assert.equal(service.qualifiesProjectSignupWindow('2026-11-12','2026-10-27','2026-10-27',15,'new_registration'),false,
  'A project uploaded after the window cannot earn credits');
assert.match(editor,/Registration eligibility/,'Conditional editor exposes registration filter');
assert.match(editor,/Anyone \(existing and new businesses\)/);
assert.match(editor,/New registrations only/);
assert.match(editor,/registrationScope:item\.registration_scope/,'Existing rewards load saved registration filtering');
assert.match(editor,/registrationScope:'new_registration'/,'Project welcome preset defaults to new registrants');
assert.match(source,/if\(!qualifiesCampaignSignup\(campaign,business\.created_at\)\)continue/,'Lazy grant path enforces signup scope');
assert.match(source,/if\(campaign\.registration_scope==='new_registration'\)/,'Bulk grant matching enforces signup scope');
assert.match(source,/u\.created_at>=\$\{start\}::timestamp/,'SQL signup cutoff uses campaign creation');
assert.match(source,/registration_scope=\$20/,'Reward edits persist registration filter');
assert.match(source,/campaign\.registrationScope/,'Reward creation persists registration filter');
assert.match(source,/ON CONFLICT DO NOTHING/,'Recurring qualification cannot duplicate grants');
assert.match(migration,/DEFAULT 'any'/,'Existing campaign registration scope defaults to anyone');
assert.match(migration,/WHERE project_registration_window_days>0/,'Legacy signup-window campaigns keep their signup rule');
console.log('Conditional lead rewards: registration eligibility, cutoff, deadlines and deduplication checks passed.');
