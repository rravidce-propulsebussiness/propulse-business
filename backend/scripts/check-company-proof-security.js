const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const authService = fs.readFileSync(path.join(root, 'services', 'authService.js'), 'utf8');
const authController = fs.readFileSync(path.join(root, 'controllers', 'authController.js'), 'utf8');
const authRoutes = fs.readFileSync(path.join(root, 'routes', 'authRoutes.js'), 'utf8');

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

assert(
  authService.includes('WHERE id=$1 AND (user_id=$2 OR $3=TRUE)') &&
  authService.includes('getCompanyProofDocument, login'),
  'Company-proof access must be limited to the owning user or an admin and exported for the protected route',
);

assert(
  authController.includes('path.basename(document.stored_name)') &&
  authController.includes('filePath.startsWith(path.resolve(uploadDir) + path.sep)'),
  'Company-proof download must constrain the resolved file path to the proof directory',
);

console.log('Company proof security regression test passed.');
