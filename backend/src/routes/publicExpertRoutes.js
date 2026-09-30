const express=require('express');
const publicExpertController=require('../controllers/publicExpertController');

const router=express.Router();
router.get('/',publicExpertController.list);

module.exports=router;
