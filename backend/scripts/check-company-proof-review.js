const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const service = fs.readFileSync(path.join(root, 'services', 'adminService.js'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'controllers', 'adminController.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'routes', 'adminRoutes.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'database', 'migrations', '2026-09-23-company-proof-review.sql'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(service.includes('company_proof_documents'), 'Admin service must query company proof documents');
assert(service.includes("status IN ('pending','verified','rejected')"), 'Admin service must constrain review status');
assert(service.includes('FOR UPDATE'), 'Company proof review mutation must lock the document row');
assert(service.includes('reviewed_by') && service.includes('reviewed_at') && service.includes('review_reason'), 'Company proof review metadata must be persisted');
assert(service.includes("status <> 'pending'"), 'Company proof review must reject non-pending transitions');

assert(controller.includes('getCompanyProofs'), 'Admin controller must expose company proof listing');
assert(controller.includes('verifyCompanyProof') && controller.includes('rejectCompanyProof'), 'Admin controller must expose verify/reject actions');

assert(routes.includes("router.get('/company-proofs'") && routes.includes("router.patch('/company-proofs/:documentId/verify'") && routes.includes("router.patch('/company-proofs/:documentId/reject'"), 'Admin routes must expose protected company proof review endpoints');

assert(migration.includes('reviewed_by INTEGER REFERENCES users(id)') && migration.includes('review_reason TEXT'), 'Company proof review migration must persist reviewer and rejection metadata');

console.log('Company proof review regression test passed.');
