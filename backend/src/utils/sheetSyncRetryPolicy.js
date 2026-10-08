// A stable source fingerprint proves only that the sheet did not change.
// It does not prove that a previous import completed without row failures.
function shouldSkipUnchangedSheet({force=false,previousFingerprint,nextFingerprint,lastFailed=0}={}){
  if(force||!previousFingerprint||!nextFingerprint)return false;
  const failures=Number(lastFailed??0);
  if(!Number.isFinite(failures)||failures>0)return false;
  return String(previousFingerprint)===String(nextFingerprint);
}
module.exports={shouldSkipUnchangedSheet};
