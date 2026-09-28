const adminService = require('../services/adminService');
const adminTestResetService = require('../services/adminTestResetService');
const adminUser360Service = require('../services/adminUser360Service');
const adminSystemHealthService = require('../services/adminSystemHealthService');
const adminFinancialIntegrityService = require('../services/adminFinancialIntegrityService');

async function getDashboardStats(req, res) {
  try { return res.json(await adminService.getDashboardStats()); }
  catch (error) { console.error('Get admin dashboard stats failed:', error.message); return res.status(500).json({ error: 'Failed to load dashboard statistics' }); }
}
async function getSystemHealth(req,res){
  try{return res.json(await adminSystemHealthService.getSystemHealth())}
  catch(error){console.error('Get admin system health failed:',error);return res.status(500).json({error:'Failed to load system health'})}
}
async function getFinancialIntegrity(req,res){
  try{return res.json(await adminFinancialIntegrityService.getFinancialIntegrity({force:String(req.query?.refresh||'')==='1'}))}
  catch(error){console.error('Get admin financial integrity failed:',error);return res.status(500).json({error:'Failed to run financial reconciliation'})}
}
async function getUsers(req, res) { try { return res.json(await adminService.getUsers(req.query)); } catch (error) { console.error('Get admin users failed:', error.message); return res.status(500).json({ error: 'Failed to load users' }); } }
async function createAdmin(req, res) {
  try { return res.status(201).json(await adminService.createAdmin(req.body || {})); }
  catch (error) {
    if (error.code === 'EMAIL_EXISTS') return res.status(409).json({ error: error.message });
    if (error.code === 'INVALID_ADMIN') return res.status(400).json({ error: error.message });
    console.error('Create admin failed:', error.message);
    return res.status(500).json({ error: 'Failed to create admin' });
  }
}
async function setUserStatus(req, res) { try { const user = await adminService.setUserStatus(req.params.id, Boolean(req.body?.isActive), req.user?.id); if (!user) return res.status(404).json({ error: 'User not found' }); return res.json(user); } catch (error) { if (error.code === 'LAST_ADMIN') return res.status(409).json({ error: error.message, code: error.code }); console.error('Set user status failed:', error.message); return res.status(500).json({ error: 'Failed to update user status' }); } }
async function setUserRole(req, res) {
  try { return res.json(await adminService.setUserRole({ userId: req.params.id, role: req.body?.role, actingAdminId: req.user.id })); }
  catch (error) {
    const map = { INVALID_ROLE: 400, NOT_FOUND: 404, SELF_ROLE_CHANGE: 400, LAST_ADMIN: 409 };
    if (map[error.code]) return res.status(map[error.code]).json({ error: error.message, code: error.code });
    console.error('Set user role failed:', error.message);
    return res.status(500).json({ error: 'Failed to change account type' });
  }
}
async function updateUserProfile(req, res) {
  try { return res.json(await adminService.updateUserProfile(req.params.id, req.body || {}, req.user?.id)); }
  catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'EMAIL_EXISTS' || error.code === 'INVALID_USER') return res.status(400).json({ error: error.message });
    console.error('Update admin user profile failed:', error.message);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
}
async function getUser360(req,res){
  try{
    const data=await adminUser360Service.getUser360(req.params.id);
    if(!data)return res.status(404).json({error:'User not found'});
    return res.json(data);
  }catch(error){
    console.error('Get Admin User 360 failed:',error);
    return res.status(500).json({error:'Failed to load account workspace'});
  }
}

async function setUserMembershipPlan(req,res){
  try{
    return res.json(await adminUser360Service.setMembershipPlan({
      userId:req.params.id,
      planId:req.body?.planId,
      days:req.body?.days,
      reason:req.body?.reason,
      adminId:req.user?.id
    }));
  }catch(error){
    const map={NOT_FOUND:404,INVALID_PLAN:400,INVALID_MEMBERSHIP_DAYS:400,REASON_REQUIRED:400};
    if(map[error.code])return res.status(map[error.code]).json({error:error.message,code:error.code});
    console.error('Admin set user membership failed:',error);
    return res.status(500).json({error:'Failed to update user membership'});
  }
}

async function getCompanyProofs(req, res) {
  try { return res.json(await adminService.getCompanyProofs(req.query)); }
  catch (error) {
    if (error.code === 'INVALID_PROOF_STATUS') return res.status(400).json({ error: error.message, code: error.code });
    console.error('Get company proofs failed:', error.message);
    return res.status(500).json({ error: 'Failed to load company proof documents' });
  }
}

async function verifyCompanyProof(req, res) {
  try {
    return res.json(await adminService.reviewCompanyProof({
      documentId: req.params.documentId,
      status: 'verified',
      reviewedBy: req.user.id,
    }));
  } catch (error) {
    const map = { INVALID_PROOF_DOCUMENT: 400, INVALID_PROOF_STATUS: 400, INVALID_REVIEWER: 400, NOT_FOUND: 404, PROOF_ALREADY_REVIEWED: 409 };
    if (map[error.code]) return res.status(map[error.code]).json({ error: error.message, code: error.code });
    console.error('Verify company proof failed:', error.message);
    return res.status(500).json({ error: 'Failed to verify company proof' });
  }
}

async function rejectCompanyProof(req, res) {
  try {
    return res.json(await adminService.reviewCompanyProof({
      documentId: req.params.documentId,
      status: 'rejected',
      reviewReason: req.body?.reason,
      reviewedBy: req.user.id,
    }));
  } catch (error) {
    const map = {
      INVALID_PROOF_DOCUMENT: 400,
      INVALID_PROOF_STATUS: 400,
      INVALID_REVIEWER: 400,
      REJECTION_REASON_REQUIRED: 400,
      REJECTION_REASON_TOO_LONG: 400,
      NOT_FOUND: 404,
      PROOF_ALREADY_REVIEWED: 409,
    };
    if (map[error.code]) return res.status(map[error.code]).json({ error: error.message, code: error.code });
    console.error('Reject company proof failed:', error.message);
    return res.status(500).json({ error: 'Failed to reject company proof' });
  }
}


async function getTestResetPreview(req,res){
  try{return res.json(await adminTestResetService.preview())}
  catch(error){console.error('Get test reset preview failed:',error.message);return res.status(500).json({error:'Failed to load test reset status'})}
}

async function resetTestData(req,res){
  try{return res.json(await adminTestResetService.reset({confirmation:req.body?.confirmation,adminId:req.user?.id}))}
  catch(error){
    if(error.code==='RESET_DISABLED')return res.status(403).json({error:error.message,code:error.code});
    if(error.code==='RESET_CONFIRMATION_REQUIRED')return res.status(400).json({error:error.message,code:error.code});
    console.error('Reset test data failed:',error);
    return res.status(500).json({error:'Failed to reset test data',code:error.code});
  }
}

module.exports = { getDashboardStats, getSystemHealth, getFinancialIntegrity, getUsers, getUser360, setUserMembershipPlan, createAdmin, setUserStatus, setUserRole, updateUserProfile, getCompanyProofs, verifyCompanyProof, rejectCompanyProof, getTestResetPreview, resetTestData };

