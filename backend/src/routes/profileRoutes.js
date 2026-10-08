const express = require('express');
const profileController = require('../controllers/profileController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);
router.post('/projects/video', profileController.uploadProjectVideo);
router.post('/projects/plan', profileController.uploadProjectPlan);
router.post('/projects/image', profileController.uploadProjectImage);
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;
