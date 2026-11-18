const { createIntervalScheduler } = require('./intervalSchedulerService');
const { autoConnectNewAdminForms } = require('./metaLeadAdsService');

const configuredInterval = Number(process.env.META_LEAD_FORM_DISCOVERY_INTERVAL_MS);
const intervalMs = Number.isFinite(configuredInterval)
  ? Math.min(3600000, Math.max(60000, configuredInterval))
  : 300000;

const startScheduledSync = createIntervalScheduler({
  label: 'Meta form auto-discovery',
  intervalMs,
  startMessage: `Meta active-form auto-discovery started (every ${Math.round(intervalMs / 60000)} minute(s)).`,
  run: () => autoConnectNewAdminForms(),
});

function startMetaLeadFormDiscoveryScheduler(options = {}) {
  return startScheduledSync(options);
}

module.exports = { startMetaLeadFormDiscoveryScheduler };
