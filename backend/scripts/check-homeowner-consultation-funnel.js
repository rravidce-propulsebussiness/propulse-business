const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const routes = read('src/routes/customerFlowRoutes.js');
const controller = read('src/controllers/customerFlowController.js');
const intake = read('src/services/publicLeadIntakeService.js');
const media = read('src/services/homepageMediaService.js');
const faqService = read('src/services/faqService.js');
const home = read('../frontend/src/pages/Home.jsx');
const requirement = read('../frontend/src/pages/RequirementWizard.jsx');
const adminLeads = read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const projects = read('../frontend/src/pages/Projects.jsx');

assert.match(routes, /router\.post\('\/:key\/consultation'/);
assert.match(controller, /submitConsultation/);
assert.match(intake, /source:\s*'homepage_consultation'/);
assert.match(intake, /enrichConsultationLead/);
assert.match(intake, /source='public_requirement'/);
assert.match(home, /\/customer-flows\/.*\/consultation/);
assert.match(home, /consultForm\.consent/);
assert.match(home, /consultForm\.name/);
assert.match(home, /\/homepage-media/);
assert.match(home, /audience="homeowner"/);
assert.match(requirement, /saved\.submissionKey/);
assert.match(requirement, /initialSubmissionKey/);
assert.match(adminLeads, /CONSULTATION CAPTURED/);
assert.match(media, /why_homeowners/);
assert.match(media, /final_cta/);
assert.match(faqService, /'homeowner'/);
assert.doesNotMatch(projects, /Explore Real<em>Projects/);

console.log('Homeowner consultation funnel checks passed.');
