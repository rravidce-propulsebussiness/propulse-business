const express = require('express');
const profileController = require('../controllers/profileController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);
router.post('/projects/video', profileController.uploadProjectVideo);
router.post('/projects/plan', profileController.uploadProjectPlan);
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;
