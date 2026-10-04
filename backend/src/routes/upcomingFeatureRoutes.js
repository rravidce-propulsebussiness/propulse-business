const express=require('express');
const controller=require('../controllers/upcomingFeatureController');
const router=express.Router();
router.get('/',controller.getPublic);
module.exports=router;