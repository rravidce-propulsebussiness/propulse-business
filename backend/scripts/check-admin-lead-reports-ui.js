const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const page=read('../frontend/src/admin/pages/AdminLeadReports.jsx');
const css=read('../frontend/src/admin/pages/AdminLeadReports.css');
const service=read('src/services/leadReportService.js');

assert(!page.includes('LEAD QUALITY'),'Lead Reports must not render the removed eyebrow');
assert(!page.includes('<h1>Lead Reports</h1>'),'Lead Reports must not render the removed page title');
assert(!page.includes('Review customer reports, verify lead quality, and control reporting access for repeat false reporters.'),'Lead Reports must not render the removed page description');

for(const label of ['Pending Reports','Verified Genuine','Verified Fake','Rejected','Repeat Reporters']){
  assert(page.includes(label),`Premium KPI card missing: ${label}`);
}
assert(page.includes("const [search,setSearch]=useState('')"),'Lead Reports must keep premium report search');
assert(page.includes('Customer Reports'),'Reports workspace must use the compact Customer Reports heading');
assert(page.includes("No reports in this view"),'Lead Reports must keep a designed empty state');
assert(page.includes("review(row.id,'verified_fake')")&&page.includes("review(row.id,'verified_genuine')")&&page.includes("review(row.id,'rejected')"),'Existing report review actions must remain wired');
assert(page.includes('setControl(row.reporter_user_id,!enabled)'), 'Existing reporter access control must remain wired');

assert(service.includes("COUNT(*) FILTER(WHERE r.status='pending')"),'Lead Reports service must return real pending summary counts');
assert(service.includes("COALESCE(c.false_report_count,0)>=2"),'Lead Reports service must return repeat reporter count');
assert(service.includes('return{data:result.rows,summary,pagination:'),'Lead Reports summary must be returned with existing data/pagination');

assert(css.includes('.lead-report-metrics'),'Premium metric card styles must exist');
assert(css.includes('.lead-report-tabs'),'Premium segmented report filters must exist');
assert(css.includes('.lead-report-workspace'),'Premium report workspace styles must exist');
assert(css.includes('.lead-report-empty-art'),'Premium report empty-state illustration must exist');

console.log('Admin Lead Reports premium UI regression test passed.');
