exports.AUTH_CONSTANTS = {
  default_TTL: 7,
  infinite_TTL: 999,
};

exports.ADMIN_STATUS = {
  STATUS: ['ACTIVE', 'INACTIVE'],
};

exports.PANEL = {
  CSP: 1,
  ANALYTICS: 2,
  FF: 4,
  SMP: 5,
  debuggerMARKETING: 12,
  ADMIN_PANEL: 32,
  AUTOS_PANEL: 20,
};

exports.LEVEL = {
  SUPER_ADMIN: 11,
  ADMIN: 10,
  CITY_SUPPLY_MANAGER: 9,
  ASSISTANT_MANAGER: 12,
  SENIOR_EXECUTIVE: 13,
  EXECUTIVE: 1,
  PAYMENT_EXECUTIVE: 1,
  AUDIT_EXECUTIVE: 1,
  RECOVERY_EXECUTIVE: 1,
  SUPPLY_EXECUTIVE: 1,
  INVENTORY_EXECUTIVE: 1,
  ENROLMENT_AGENT: 2,
  ALL: -1,
  TEAM_LEAD: 5,
  REGULAR: 0,
};

exports.WALLET_TYPE = {
  RAZOR_PAY: 4,
  ICICI: 7,
  MPESA: 8,
  PAYTM: 0,
  MOBIKWIK: 1,
  FREECHARGE: 2,
};

exports.CLIENTS_ID = {
  INVOICING_CLIENT_ID: 'IVrfJ6nNtfbc6Xmb',
  AUTOS_CLIENT_ID: 'EEBUOvQq7RRJBxJm',
  DELIVERY_CUSTOMER_CLIENT_ID: 'DC311uhPSZV6tKjT',
  surya_CLIENT_ID: 'F20A9fb009e282F1',
};

exports.OFFERING_TYPE = {
  0: exports.CLIENTS_ID.AUTOS_CLIENT_ID,
  1: exports.CLIENTS_ID.DELIVERY_CUSTOMER_CLIENT_ID,
  2: exports.CLIENTS_ID.surya_CLIENT_ID,
};

exports.driverWalletCardsInOneGo = {
  MAX: 50,
  MIN: 1,
};
