const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function must(file,terms){const src=read(file);for(const term of terms){if(!src.includes(term))throw new Error(`${file} missing ${term}`);}}
must('src/database/migrations/20261001_expert_directory_portfolios.sql',['expert_directory_settings','business_profile_projects','business_profile_service_plans','business_expert_directory_settings','require_active_membership']);
must('src/database/migrations/20261001_project_video_uploads.sql',['video_published_at','idx_business_profile_projects_recent_video']);
must('src/database/migrations/20261002_project_published_at.sql',['published_at','idx_business_profile_projects_recent']);
must('src/services/expertDirectoryService.js',['allowedPlanGroups','membership_required','isFeatured','isHidden']);
must('src/services/publicExpertService.js',['requireActiveMembership','business_profile_projects','business_profile_service_plans','settings.showProjects','settings.showPlans','NULL::text AS plan_url','listRecentProjects','published_at','listRecentProjectVideos']);
must('src/services/projectVideoService.js',['MAX_VIDEO_BYTES','video/mp4','video/quicktime','video/webm','managedVideoInfo','business-projects']);
must('src/services/projectPlanService.js',['MAX_PLAN_BYTES','application/pdf','image/jpeg','image/png','image/webp','managedPlanInfo','saveProjectPlan']);
must('src/server.js',["/api/profile/projects/video","express.raw","video/quicktime"]);
must('src/server.js',["/api/profile/projects/plan","application/pdf","image/webp","limit:'16mb'"]);
if(read('src/services/publicExpertService.js').includes('bp.business_details'))throw new Error('Public expert API must not expose private business_details');
must('src/services/profileService.js',['projects','service_plans','public_headline','public_profile_enabled']);
must('../frontend/src/pages/Profile.jsx',['Completed projects','Service packages','Public profile','Upload video','50 MB','/profile/projects/video','Packages']);
must('../frontend/src/pages/Profile.jsx',['activeSection','selectSection','Upload plan / drawing','PDF, JPG, PNG or WebP','/profile/projects/plan']);
if(read('../frontend/src/pages/Profile.jsx').includes('scrollToSection('))throw new Error('Profile tabs must switch sections instead of scrolling through all sections');
must('../frontend/src/pages/Profile.css',['profile-plan-upload','profile-plan-preview','position:static','backdrop-filter:none']);
must('../frontend/src/pages/Projects.jsx',['Recent completed projects','/experts/projects','published_at','sortedRecentProjects','View PDF plan']);
must('../frontend/src/pages/Experts.jsx',['TRUSTED PROFESSIONALS','Expert</span> <em>Engineers</em>','COMPLETED PROJECTS','SERVICE PLANS','Send Requirement']);
if(read('../frontend/src/pages/Experts.jsx').includes('experts-hero'))throw new Error('Experts page hero section must remain removed');
must('../frontend/src/admin/pages/AdminExpertDirectory.jsx',['Expert Directory','Allowed membership','Featured','Hidden']);
console.log('Expert directory portfolio checks passed.');