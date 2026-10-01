const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function must(file,terms){const src=read(file);for(const term of terms){if(!src.includes(term))throw new Error(`${file} missing ${term}`);}}
must('src/database/migrations/20261001_expert_directory_portfolios.sql',['expert_directory_settings','business_profile_projects','business_profile_service_plans','business_expert_directory_settings','require_active_membership']);
must('src/services/expertDirectoryService.js',['allowedPlanGroups','membership_required','isFeatured','isHidden']);
must('src/services/publicExpertService.js',['requireActiveMembership','business_profile_projects','business_profile_service_plans','settings.showProjects','settings.showPlans','NULL::text AS plan_url']);
if(read('src/services/publicExpertService.js').includes('bp.business_details'))throw new Error('Public expert API must not expose private business_details');
must('src/services/profileService.js',['projects','service_plans','public_headline','public_profile_enabled']);
must('../frontend/src/pages/Profile.jsx',['Completed projects','Service plans','Public profile']);
must('../frontend/src/pages/Experts.jsx',['SUBSCRIBED PROPULSE PROFESSIONALS','Completed projects','Service plans']);
must('../frontend/src/admin/pages/AdminExpertDirectory.jsx',['Expert Directory','Allowed membership','Featured','Hidden']);
console.log('Expert directory portfolio checks passed.');