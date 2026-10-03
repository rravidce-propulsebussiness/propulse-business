require('dotenv').config();
process.env.ALLOW_DEGRADED_STARTUP=process.env.ALLOW_DEGRADED_STARTUP||'true';
require('./src/server');
