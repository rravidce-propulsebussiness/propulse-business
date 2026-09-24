const MONEY_SCALE = 100;

function parseMoneyPaise(value, { allowZero = false, code = 'INVALID_AMOUNT' } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) throw Object.assign(new Error('Amount must be greater than zero'), { code });

  let normalized = raw;
  if (/e/i.test(normalized)) {
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) throw Object.assign(new Error('Amount must be greater than zero'), { code });
    normalized = numeric.toFixed(2);
  }

  const match = normalized.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!match) throw Object.assign(new Error('Amount must be a valid monetary value'), { code });

  const sign = match[1] === '-' ? -1 : 1;
  const whole = BigInt(match[2]);
  const fraction = (match[3] || '').padEnd(3, '0');
  const cents = BigInt(fraction.slice(0, 2) || '0');
  const third = Number(fraction[2] || '0');

  let paise = whole * 100n + cents;
  if (third >= 5) paise += 1n;
  paise *= BigInt(sign);

  if (paise < 0n || (!allowZero && paise === 0n)) {
    throw Object.assign(new Error('Amount must be greater than zero'), { code });
  }
  return paise;
}

function paiseToMoney(paise) {
  if (typeof paise === 'number') {
    if (!Number.isSafeInteger(paise)) throw new Error('Money value is outside the safe integer range');
    return paise / MONEY_SCALE;
  }
  if (typeof paise !== 'bigint') throw new Error('Invalid money value');
  const negative = paise < 0n;
  const absolute = negative ? -paise : paise;
  const whole = absolute / 100n;
  const cents = String(absolute % 100n).padStart(2, '0');
  const result = Number(whole) + Number(cents) / 100;
  if (!Number.isSafeInteger(Number(whole)) && Number(whole) > Number.MAX_SAFE_INTEGER / 100) {
    throw new Error('Money value is outside the safe integer range');
  }
  return negative ? -result : result;
}

module.exports = { MONEY_SCALE, parseMoneyPaise, paiseToMoney };
