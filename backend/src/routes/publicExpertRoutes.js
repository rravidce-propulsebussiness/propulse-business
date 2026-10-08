const express=require('express');
const rateLimit=require('../middleware/rateLimitMiddleware');
const publicExpertController=require('../controllers/publicExpertController');

const router=express.Router();
router.get('/',publicExpertController.list);
router.get('/projects',publicExpertController.projects);
router.get('/projects/:projectId',publicExpertController.projectDetail);
router.post('/projects/:projectId/callback',rateLimit({windowMs:60*60*1000,max:5}),publicExpertController.requestProjectCallback);
router.get('/project-videos',publicExpertController.projectVideos);
router.post('/:expertId/callback',rateLimit({windowMs:60*60*1000,max:5}),publicExpertController.requestProfileCallback);
router.get('/:expertId',publicExpertController.get);

module.exports=router;