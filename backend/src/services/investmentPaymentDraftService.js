const crypto = require('crypto');

const drafts = new Map();
const TTL_MS = 15 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [id, draft] of drafts.entries()) {
    if (now - draft.createdAt > TTL_MS) drafts.delete(id);
  }
}

function create({ userId, industryId, stateId, cityId, amount, reinvestmentEnabled = false }) {
  cleanup();
  const id = `draft_${crypto.randomBytes(18).toString('hex')}`;
  drafts.set(id, {
    userId: Number(userId),
    industryId: Number(industryId),
    stateId: stateId == null ? null : Number(stateId),
    cityId: cityId == null ? null : Number(cityId),
    amount: Number(amount),
    reinvestmentEnabled: Boolean(reinvestmentEnabled),
    createdAt: Date.now(),
  });
  return id;
}

function consume(id, userId) {
  cleanup();
  const draft = drafts.get(String(id));
  if (!draft || Number(draft.userId) !== Number(userId)) return null;
  drafts.delete(String(id));
  return draft;
}

module.exports = { create, consume };
