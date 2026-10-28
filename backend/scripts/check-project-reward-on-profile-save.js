const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const profile=read('backend/src/services/profileService.js');
const rewards=read('backend/src/services/leadEntitlementGrantService.js');

assert.match(profile,/ensureProjectQualifiedCampaignGrants\(userId,client\)/,'A saved profile must trigger conditional reward issuance');
assert.match(profile,/await client.query\('COMMIT'\);[\s\S]{0,450}await ensureProjectQualifiedCampaignGrants\(userId,client\)/,
  'Reward issuance occurs after successful profile commit, without breaking an otherwise valid profile save');
assert.match(profile,/SELECT id,created_at,video_url/,'Existing project upload timestamp is selected');
assert.match(profile,/const createdAt=previous\?\.created_at\|\|new Date\(\)/,'Editing retains original upload date');
assert.match(profile,/seo_keyword,created_at\)/,'Project upsert persists immutable first upload date');
assert.match(profile,/created_at:new Date\(item.createdAt\)\.toISOString\(\)/,'Project first-upload date survives full profile replacement');
assert.match(rewards,/p\.is_published=TRUE AND p\.completion_year IS NOT NULL/,
  'Only a published completed project counts for the reward');
const target=rewards.slice(rewards.indexOf('async function ensureProjectQualifiedCampaignGrants'),rewards.indexOf('function allowanceFor('));
assert.ok(target.length>0);
assert.doesNotMatch(target,/p\.video_url|p\.cover_image_url|p\.image_urls/,
  'Video, cover photo and gallery media are not required to earn this reward');
assert.match(target,/ON CONFLICT DO NOTHING/,'Repeated saves do not duplicate the reward');
console.log('Completed project reward issues on Save once; video is optional; original upload time remains stable');
