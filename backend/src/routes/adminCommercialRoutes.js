const express=require('express');
const c=require('../controllers/adminCommercialController');
const auth=require('../middleware/authMiddleware');
const router=express.Router();
function admin(req,res,next){if(req.user?.role!=='admin')return res.status(403).json({error:'Admin access required'});next()}
router.use(auth,admin);
router.get('/investor-settings',c.investorSettings);
router.put('/investor-settings',c.updateInvestor);
module.exports=router;
