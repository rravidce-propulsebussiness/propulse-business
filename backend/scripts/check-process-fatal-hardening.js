const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const server=read('src/server.js');
const worker=read('src/worker.js');

assert(server.includes("app.use('/api',(req,res,next)=>{res.setHeader('Cache-Control','no-store, private')"),'API responses must explicitly disable browser/proxy caching');
assert(server.includes("res.setHeader('Pragma','no-cache')")&&server.includes("res.setHeader('Expires','0')"),'Legacy cache prevention headers must accompany Cache-Control');
assert(server.includes("async function shutdown(signal,exitCode=0)"),'Web shutdown must support a fatal non-zero exit code');
assert(server.includes("process.once('uncaughtException'"),'Web process must handle uncaught exceptions through graceful shutdown');
assert(server.includes("process.once('unhandledRejection'"),'Web process must handle unhandled rejections through graceful shutdown');
assert(server.includes("shutdown('uncaughtException',1)")&&server.includes("shutdown('unhandledRejection',1)"),'Fatal web errors must exit non-zero');
assert(worker.includes("async function shutdown(signal, exitCode = 0)"),'Worker shutdown must support a fatal non-zero exit code');
assert(worker.includes("process.once('uncaughtException'")&&worker.includes("process.once('unhandledRejection'"),'Worker must trap fatal process errors');
assert(worker.includes("shutdown('uncaughtException', 1)")&&worker.includes("shutdown('unhandledRejection', 1)"),'Fatal worker errors must exit non-zero');
console.log('API cache and fatal-process hardening regression test passed.');
