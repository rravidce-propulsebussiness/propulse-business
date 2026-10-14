'use strict';

/**
 * Only a COMPLETED purchase gives access to a lead's private contact details
 * in Business OS. An entitlement or membership claim is not a paid purchase.
 * getPurchases already scopes purchase rows to the bearer-token owner.
 */
const isPaidPurchase = (row) =>
  row != null &&
  row.purchase_status === 'paid' &&
  Number.isSafeInteger(Number(row.access_id)) &&
  Number(row.access_id) > 0 &&
  Number.isSafeInteger(Number(row.payment_id)) &&
  Number(row.payment_id) > 0;

const businessOsPaidPurchases = (rows) =>
  rows.filter(isPaidPurchase);

module.exports = { isPaidPurchase, businessOsPaidPurchases };
