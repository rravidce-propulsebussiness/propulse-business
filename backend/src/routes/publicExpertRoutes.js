const express=require('express');
const rateLimit=require('../middleware/rateLimitMiddleware');
const publicExpertController=require('../controllers/publicExpertController');

const router=express.Router();
router.get('/',publicExpertController.list);
router.get('/projects',publicExpertController.projects);
router.get('/project-videos',publicExpertController.projectVideos);
router.get('/:expertId',publicExpertController.get);

module.exports=router;