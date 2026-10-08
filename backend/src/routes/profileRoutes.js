const express = require('express');
const profileController = require('../controllers/profileController');
const requireAuth = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
router.use(requireAuth);
router.post('/projects/video/uploads/start', profileController.startProjectVideoUpload);
router.post('/projects/video/uploads/part-url', profileController.signProjectVideoPart);
router.post('/projects/video/uploads/finish', profileController.finishProjectVideoUpload);
router.post('/projects/video/uploads/abort', profileController.abortProjectVideoUpload);
router.post('/projects/video', profileController.uploadProjectVideo);
router.post('/projects/plan', profileController.uploadProjectPlan);
router.post('/projects/image', profileController.uploadProjectImage);
router.post('/request-access/:kind/:id/accept',rateLimit({windowMs:60000,max:15}), profileController.acceptProjectRequest);
router.get('/project-callbacks', profileController.listProjectCallbacks);
router.get('/project-quote-requests',profileController.listProjectQuotes);
router.patch('/project-quote-requests/:quoteId',profileController.updateProjectQuote);
router.get('/brochures', profileController.listBrochures);
router.put('/brochures', profileController.saveBrochures);
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;
