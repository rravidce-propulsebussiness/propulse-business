const cycleService = require('../services/investmentCycleService');

async function current(req,res){
  try {
    const cycle = await cycleService.getCycleSummary(Number(req.user.id), req.query.cycleId ? Number(req.query.cycleId) : null);
    return res.json(cycle || { cycle:null });
  } catch (e) {
    console.error('Investment cycle load failed:', e.message);
    return res.status(500).json({ error:'Failed to load investment cycle' });
  }
}

async function requestFinalExit(req,res){
  try {
    const cycle = await cycleService.requestFinalExit({
      userId:Number(req.user.id),
      cycleId:req.body?.cycleId ? Number(req.body.cycleId) : null
    });
    return res.json(cycle);
  } catch (e) {
    const map={CYCLE_NOT_FOUND:404,CYCLE_ALREADY_CLOSED:409,CYCLE_NOT_MATURED:400,CYCLE_CLOSING:409};
    return res.status(map[e.code]||400).json({error:e.message||'Failed to request cycle exit',code:e.code});
  }
}

async function adminList(req,res){
  try {
    return res.json(await cycleService.adminList());
  } catch (e) {
    console.error('Admin investment cycles load failed:',e);
    return res.status(500).json({error:'Failed to load investment cycles'});
  }
}

async function adminFinish(req,res){
  try {
    const cycle = await cycleService.adminFinishCycle({
      cycleId:Number(req.params.id),
      adminId:Number(req.user.id),
      reason:req.body?.reason,
    });
    return res.json(cycle);
  } catch (e) {
    const map={CYCLE_NOT_FOUND:404,CYCLE_ALREADY_CLOSED:409,REASON_REQUIRED:400,REASON_TOO_LONG:400,LEADS_NOT_FINAL:409};
    return res.status(map[e.code]||500).json({error:e.message||'Failed to finish investment cycle',code:e.code});
  }
}

module.exports={current,requestFinalExit,adminList,adminFinish};
