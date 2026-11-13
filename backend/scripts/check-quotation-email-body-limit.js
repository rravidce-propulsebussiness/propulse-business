// Regression: the homeowner quotation email posts the generated PDF (~1-2 MB base64), but
// /api/customer-flows had a 64 KB JSON limit, so every quotation email failed with 413.
const fs=require('fs');
const path=require('path');
const server=fs.readFileSync(path.join(__dirname,'..','src','server.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const large=server.indexOf("app.use('/api/customer-flows/:key/:leadId/quotation-email',largeJsonFor('POST'))");
const small=server.indexOf("app.use('/api/customer-flows',express.json({limit:'64kb'}))");
assert(large>=0,'Quotation email route must use the large JSON parser');
assert(small<0||large<small,'Large quotation-email parser must be mounted before the 64 KB customer-flows parser');
console.log('Quotation email body limit regression test passed.');
