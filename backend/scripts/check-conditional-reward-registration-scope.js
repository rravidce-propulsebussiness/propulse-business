const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const service=require('../src/services/leadEntitlementGrantService');
const source=read('src/services/leadEntitlementGrantService.js');
const editor=read('../frontend/src/admin/pages/AdminLeadEntitlements.jsx');
const migration=read('src/database/migrations/20261027_zzz_conditional_reward_registration_scope.sql');
const ageMigration=read('src/database/migrations/20261028_lead_reward_registration_age_window.sql');
const created='2026-10-27T00:00:00Z';
assert.equal(service.qualifiesCampaignSignup({registration_scope:'new_registration',created_at:created},'2026-10-26T23:59:59Z'),false,
  'Registrations before campaign creation must not receive signup-only rewards');
assert.equal(service.qualifiesCampaignSignup({registration_scope:'new_registration',created_at:created},'2026-10-27T00:00:00Z'),true,
  'Registrations from campaign creation onward are eligible');
assert.equal(service.qualifiesCampaignSignup({registration_scope:'any',created_at:created},'2024-01-01T00:00:00Z'),true,
  'Anyone includes existing businesses');
assert.equal(service.qualifiesCampaignSignup({registration_scope:'new_registration',created_at:created},'invalid'),false,
  'Invalid dates must not pass a new-registration check');
const account='2026-10-27T12:00:00Z';
const qualifiesAge=service.qualifiesCampaignRegistrationAge;
assert.equal(qualifiesAge({registration_eligibility_days:0},account,'2027-02-01T00:00:00Z'),true,
  'Zero is backwards-compatible and means no signup age limit');
assert.equal(qualifiesAge({registration_eligibility_days:7},account,'2026-11-03T12:00:00Z'),true,
  'A seven-day signup window includes its exact last moment');
assert.equal(qualifiesAge({registration_eligibility_days:7},account,'2026-11-03T12:00:01Z'),false,
  'Account age past seven days must not earn a new award');
assert.equal(qualifiesAge({registration_eligibility_days:8},account,'2026-11-04T12:00:00Z'),true,
  'An eight-day window is configurable');
assert.equal(qualifiesAge({registration_eligibility_days:30},account,'2026-11-26T12:00:00Z'),true,
  'Thirty days is allowed');
assert.equal(qualifiesAge({registration_eligibility_days:30},account,'2026-11-26T12:00:01Z'),false,
  'Thirty-day eligibility ends at the specified deadline');
assert.equal(qualifiesAge({registration_eligibility_days:7},account,'2026-10-26T12:00:00Z'),false,
  'Future signup dates cannot earn rewards');
assert.equal(qualifiesAge({registration_eligibility_days:7},'invalid','2026-11-01T00:00:00Z'),false,
  'Invalid signup dates must fail an age-limited reward');
assert.equal(service.qualifiesProjectSignupWindow('2026-10-16','2026-10-01','2026-10-27',15,'any'),true,
  'An anyone reward can count earlier accounts with an on-time upload');
assert.equal(service.qualifiesProjectSignupWindow('2026-10-16','2026-10-01','2026-10-27',15,'new_registration'),false,
  'New-registration project rewards must not count pre-campaign accounts');
assert.equal(service.qualifiesProjectSignupWindow('2026-11-12','2026-10-27','2026-10-27',15,'new_registration'),false,
  'A project uploaded after the window cannot earn credits');
assert.match(editor,/Registration eligibility/,'Conditional editor exposes registration filter');
assert.equal((editor.match(/<label>Registration window/g)||[]).length,2,
  'Each reward type has its own Registration window field');
const timeLimitSection=editor.slice(editor.indexOf('Qualification &amp; time limits'));
assert.match(timeLimitSection,/Registration window[\s\S]*?value=\{rule.windowDays\}/,
  'New-registration window still uses the registration rule');
assert.match(timeLimitSection,/Registration window[\s\S]*?value=\{campaign.registrationEligibilityDays\}/,
  'Conditional reward window uses its separate campaign eligibility setting');
assert.match(editor,/registrationEligibilityDays:clamp\(e.target.value,0,365\)/,
  'Conditional signup-age window remains configurable independently of registration reward');
assert.match(editor,/registrationEligibilityDays:clamp\(e.target.value,0,365\)/,'Signup age window stays editable');
assert.match(editor,/registrationEligibilityDays:Number\(item.registration_eligibility_days\|\|item.project_registration_window_days\|\|0\)/,'Legacy project rewards open with the original window value');
assert.match(editor,/Anyone \(existing and new businesses\)/);
assert.match(editor,/New registrations only/);
assert.match(editor,/registrationScope:item\.registration_scope/,'Existing rewards load saved registration filtering');
assert.match(editor,/registrationScope:'new_registration'/,'Project welcome preset defaults to new registrants');
assert.match(source,/if\(!qualifiesCampaignSignup\(campaign,business\.created_at\)\)continue/,'Lazy grant path enforces signup scope');
assert.match(source,/if\(!qualifiesCampaignRegistrationAge\(campaign,business.created_at\)\)continue/,'Lazy awards enforce account-age cutoff');
assert.match(source,/registration_eligibility_days=\$21/,'Editing a campaign saves account-age cutoff');
assert.match(source,/projectRegistrationWindowDays:minCompletedProjects>0\?registrationEligibilityDays:0/,'Project upload and reward qualification use the same deadline');
assert.doesNotMatch(editor,/Project upload after signup/,'Conditional editor has only one deadline input');
assert.match(source,/u.created_at\+\(\$\{days\}::int \* INTERVAL '1 day'\)>=CURRENT_TIMESTAMP/,'Bulk award queries enforce account-age cutoff');
assert.match(source,/age_grant.revoked_at IS NULL/,'Previously awarded credits are not revoked merely for aging');
assert.match(source,/if\(campaign\.registration_scope==='new_registration'\)/,'Bulk grant matching enforces signup scope');
assert.match(source,/u\.created_at>=\$\{start\}::timestamp/,'SQL signup cutoff uses campaign creation');
assert.match(source,/registration_scope=\$20/,'Reward edits persist registration filter');
assert.match(source,/campaign\.registrationScope/,'Reward creation persists registration filter');
assert.match(source,/ON CONFLICT DO NOTHING/,'Recurring qualification cannot duplicate grants');
assert.match(migration,/DEFAULT 'any'/,'Existing campaign registration scope defaults to anyone');
assert.match(ageMigration,/ADD COLUMN IF NOT EXISTS registration_eligibility_days INTEGER NOT NULL DEFAULT 0/,'Existing campaigns have no retroactive age restriction');
assert.match(ageMigration,/CHECK\(registration_eligibility_days BETWEEN 0 AND 365\)/,'Age window is bounded');
assert.match(migration,/WHERE project_registration_window_days>0/,'Legacy signup-window campaigns keep their signup rule');
console.log('Conditional lead rewards: registration eligibility, cutoff, deadlines and deduplication checks passed.');
