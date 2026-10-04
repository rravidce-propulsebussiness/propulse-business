const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const authService = fs.readFileSync(path.join(root, 'services', 'authService.js'), 'utf8');
const authController = fs.readFileSync(path.join(root, 'controllers', 'authController.js'), 'utf8');
const authRoutes = fs.readFileSync(path.join(root, 'routes', 'authRoutes.js'), 'utf8');
const companyProofStorage = fs.readFileSync(path.join(root, 'services', 'companyProofStorageService.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  server.includes("if(req.path==='/company-proofs'||req.path.startsWith('/company-proofs/'))return res.status(404).json({error:'Not found'});"),
  'Company-proof files must not be served by the public /uploads static handler',
);

assert(
  authRoutes.includes("router.get('/company-proofs/:documentId', requireAuth, authController.downloadCompanyProof);"),
  'Company-proof download route must require authentication',
);

assert(
  authService.includes('RETURNING id') &&
  authService.includes("file_url: `/api/auth/company-proofs/${inserted.id}`"),
  'Uploaded company proofs must return the authenticated API URL instead of a public /uploads URL',
);

assert(authService.includes("const expectedPrefix = `data:${mimeType};base64,`;"), 'Company-proof uploads must require a MIME-matching data URL prefix');
assert(authService.includes("Company proof document content does not match its file type"), 'Company-proof uploads must validate file signatures');
assert(authService.includes('companyProofStorage.storeBuffer'), 'Company-proof writes must use the private storage abstraction');
assert(authService.includes('companyProofStorage.remove(reference)'), 'Company-proof rollback cleanup must use the private storage abstraction');
assert(companyProofStorage.includes("flag:'wx',mode:0o600"), 'Local company-proof fallback must create private files exclusively');
assert(companyProofStorage.includes('s3.getSignedGetUrl(reference)'), 'S3 company-proof reads must use short-lived signed URLs');

assert(
  authService.includes('WHERE id=$1 AND (user_id=$2 OR $3=TRUE)') &&
  authService.includes('getCompanyProofDocument, login'),
  'Company-proof access must be limited to the owning user or an admin and exported for the protected route',
);

assert(
  authController.includes('companyProofStorage.descriptor(document.stored_name') && authController.includes('sendProofDescriptor(res,descriptor)') &&
  companyProofStorage.includes('path.basename(String(value||\'\'))') && companyProofStorage.includes("filePath.startsWith(path.resolve(companyProofRoot)+path.sep)"),
  'Company-proof download must use the authorized storage descriptor and constrain local fallback paths',
);

console.log('Company proof security regression test passed.');
