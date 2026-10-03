const path=require('path');

process.chdir(path.join(__dirname,'backend'));
if(!process.env.NODE_ENV)process.env.NODE_ENV='production';
process.env.SERVE_FRONTEND_FROM_BACKEND='true';

require('./backend/src/server.js');
