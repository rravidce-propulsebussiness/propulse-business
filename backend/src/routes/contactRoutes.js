const express=require('express');
const controller=require('../controllers/contactController');
const router=express.Router();
router.get('/',controller.getPublic);
module.exports=router;