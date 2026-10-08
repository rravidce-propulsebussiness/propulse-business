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
if(read('../frontend/src/pages/Experts.jsx').includes('experts-hero'))throw new Error('Experts page hero section must remain removed');
must('../frontend/src/admin/pages/AdminExpertDirectory.jsx',['Expert Directory','Allowed membership','Featured','Hidden']);
must('../frontend/src/admin/pages/AdminExpertDirectory.jsx',['businessRequest=useRef(0)','searchReady=useRef(false)','requestId!==businessRequest.current','queueMicrotask']);
if(/useEffect\(\(\)=>\{\s*if\(loading\)return\s*const timer/.test(read('../frontend/src/admin/pages/AdminExpertDirectory.jsx')))throw new Error('Expert Directory search effect must not drop searches typed during initial loading');
// Professional-specific quotation leads must remain owned by the publishing business.
// Customer data is private; only admin coordination can see unmasked contacts.
must('src/database/migrations/20261008_zzzz_professional_project_quotes.sql',['professional_project_quote_requests','business_user_id','quoted_price','quoted_package']);
must('src/services/professionalProjectQuoteService.js',['listForProfessional','updateByProfessional','listForAdmin','WHERE id=$1 AND business_user_id=$2','maskPhone','maskEmail','professional_quote_request']);
must('src/routes/publicExpertRoutes.js',['/projects/:projectId/quote-request','requestProjectQuote']);
must('src/routes/profileRoutes.js',['/project-quote-requests','updateProjectQuote']);
must('src/routes/adminRoutes.js',['/professional-quote-leads']);
must('../frontend/src/pages/ProjectDetail.jsx',['submitQuote','quoteForm','/quote-request','Get Quote']);
must('../frontend/src/pages/Profile.jsx',['Quotation enquiries','saveProjectQuote','Mark Quote Ready']);
must('../frontend/src/admin/pages/AdminCallbackInbox.jsx',['professional-quote-leads','Professional-specific quote leads']);
if(/to=\{'\/quote#'\+quoteHash\(project\)\}/.test(read('../frontend/src/pages/ProjectDetail.jsx')))
  throw new Error('Project-specific Get Quote must not redirect to the general marketplace quotation flow.');

console.log('Expert directory portfolio checks passed.');