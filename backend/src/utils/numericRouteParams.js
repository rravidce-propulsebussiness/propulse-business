// Route IDs like /leads/:id are database integers. A non-numeric value ("abc") used to reach
// PostgreSQL and fail as a 500; answer it as a plain 404 before any handler runs.
const NUMERIC_ID=/^[1-9]\d{0,9}$/;

function numericRouteParams(router,...names){
  for(const name of names){
    router.param(name,(req,res,next,value)=>NUMERIC_ID.test(String(value))?next():res.status(404).json({error:'Not found'}));
  }
  return router;
}

module.exports={numericRouteParams};
