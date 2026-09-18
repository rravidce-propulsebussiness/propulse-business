const express=require('express');
const controller=require('../controllers/homepageMediaController');
const router=express.Router();
router.get('/',controller.getPublic);
module.exports=router;