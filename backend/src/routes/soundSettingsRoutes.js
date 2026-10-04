const router=require('express').Router();
const controller=require('../controllers/soundSettingsController');

router.get('/',controller.getPublic);

module.exports=router;
