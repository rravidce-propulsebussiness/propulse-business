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
must('../frontend/src/pages/Profile.jsx',['Completed Projects','Service Packages','Public profile','Upload project video','Cloudflare R2','/profile/projects/video','Packages']);
must('../frontend/src/pages/Profile.jsx',['activeSection','selectSection','Upload plan / drawing','PDF, JPG, PNG or WebP','/profile/projects/plan']);
must('src/database/migrations/20261008_project_photo_gallery.sql',['image_urls','jsonb_array_length(image_urls)<=8']);
must('src/services/projectImageService.js',['MAX_IMAGE_BYTES','image/jpeg','image/png','image/webp','saveProjectImage','managedImageInfo']);
must('src/services/profileService.js',['imageUrls','image_urls','image_display_urls','removeManagedProjectImages']);
must('src/services/publicExpertService.js',['image_urls','projectImageService.displayUrl']);
must('src/server.js',["/api/profile/projects/image","limit:'13mb'"]);
must('src/routes/profileRoutes.js',["/projects/image","uploadProjectImage"]);
must('../frontend/src/pages/Profile.jsx',['uploadProjectImages','/profile/projects/image','imageDisplayUrls','profile-gallery-upload']);
must('../frontend/src/pages/Projects.jsx',['projectPhotos','projectPath(project)','to={projectPath(project)}']);
must('../frontend/src/pages/ProjectDetail.jsx',['pjd-thumbnails','pjd-feature-media','project.video','/experts/projects/','pjd-callback-form']);
must('src/services/publicExpertService.js',['getPublicProject','bpp.id=$1','materializeProjectMedia']);
must('src/routes/publicExpertRoutes.js',["/projects/:projectId",'projectDetail']);

if(read('../frontend/src/pages/Profile.jsx').includes('scrollToSection('))throw new Error('Profile tabs must switch sections instead of scrolling through all sections');
must('../frontend/src/pages/Profile.css',['profile-plan-upload','profile-plan-preview','position:static','backdrop-filter:none']);
must('../frontend/src/pages/Projects.jsx',['/experts/projects','published_at','professionalProjects','Completed project','Verified professional']);
must('../frontend/src/pages/Experts.jsx',['TRUSTED PROFESSIONALS','Expert</span> <em>Engineers</em>','View Full Profile','Request Callback']);
must('../frontend/src/pages/ProfessionalDetails.jsx',['Completed Projects','Brochures','Published Packages','Request a Callback','/experts/']);
must('src/routes/publicExpertRoutes.js',['/:expertId/callback','requestProfileCallback']);
must('src/services/projectCallbackService.js',['requestProfileCallback','maskedPhone','maskedEmail','redactContactText']);
must('src/services/brochureService.js',['listMine','listPublic','saveMine']);
must('src/database/migrations/20261008_zzz_professional_brochures_and_callbacks.sql',['business_profile_brochures','ALTER COLUMN project_id DROP NOT NULL']);
// An individual project dossier and an individually configurable service package
// must each support owner-validated, storage-backed specification PDFs.
must('src/database/migrations/20261008_zzzzz_profile_package_brochures.sql',['business_profile_projects','business_profile_service_plans','brochure_url']);
must('src/services/profileService.js',['validateOwnedBrochure','projectPlanService.managedPlanInfo','brochure_display_url','currentManagedPlanUrls','brochure_url:item.brochureUrl']);
must('src/services/publicExpertService.js',['brochure_url:await projectPlanService.displayUrl','brochure_url,sort_order','service_plans:renderedPlans']);
must('../frontend/src/components/ProfileBrochureField.jsx',['Upload brochure PDF','PDF only','Maximum 15 MB','Preview','Remove']);
must('../frontend/src/pages/Profile.jsx',['uploadBrochure','ProfileBrochureField','brochureDisplayUrl','Company Brochures']);
must('../frontend/src/pages/ProfessionalDetails.jsx',['View Package Brochure (PDF)','Specifications PDF']);
must('../frontend/src/pages/ProjectDetail.jsx',['project.brochure||linkedPlan?.brochure_url','Download Package','downloadPackage']);
if(read('../frontend/src/pages/Experts.jsx').includes('experts-hero'))throw new Error('Experts page hero section must remain removed');
must('../frontend/src/admin/pages/AdminExpertDirectory.jsx',['Expert Directory','Allowed membership','Featured','Hidden']);
must('../frontend/src/admin/pages/AdminExpertDirectory.jsx',['businessRequest=useRef(0)','searchReady=useRef(false)','requestId!==businessRequest.current','queueMicrotask']);
if(/useEffect\(\(\)=>\{\s*if\(loading\)return\s*const timer/.test(read('../frontend/src/admin/pages/AdminExpertDirectory.jsx')))throw new Error('Expert Directory search effect must not drop searches typed during initial loading');
console.log('Expert directory portfolio checks passed.');