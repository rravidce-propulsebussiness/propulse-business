const express=require('express');
const publicExpertController=require('../controllers/publicExpertController');

const router=express.Router();
router.get('/',publicExpertController.list);
router.get('/:expertId',publicExpertController.get);

module.exports=router;