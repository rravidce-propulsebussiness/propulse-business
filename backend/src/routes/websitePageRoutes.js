const express=require('express');
const controller=require('../controllers/landingPageController');
const router=express.Router();
router.get('/',controller.publicOverride);
module.exports=router;
