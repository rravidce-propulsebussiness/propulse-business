const express=require('express');
const controller=require('../controllers/leadReportController');
const requireAuth=require('../middleware/authMiddleware');
const requireAdmin=require('../middleware/adminMiddleware');

const router=express.Router();

router.get('/mine',requireAuth,controller.mine);
router.get('/control',requireAuth,controller.myControl);
router.post('/leads/:leadId',requireAuth,controller.create);

router.get('/admin',requireAdmin,controller.adminList);
router.patch('/admin/:id',requireAdmin,controller.adminReview);
router.patch('/admin/user/:userId/control',requireAdmin,controller.adminControl);

module.exports=router;
