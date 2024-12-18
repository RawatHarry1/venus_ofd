/* exports.tables ={
    ACL_USER:'tb_acl_users'
} */
exports.DBS = {
  ADMIN_AUTH: 'venus_acl',
  LIVE_DB: 'venus_live',
};
exports.ADMIN_AUTH = {
  ACL_USER: 'tb_acl_users',
  TOKENS: 'tb_acl_tokens',
};
exports.LIVE_DB = {
  OPERATPRS: 'tb_operators',
  RIDES: 'tb_engagements',
  CAPTAINS: 'tb_drivers',
  CUSTOMERS: 'tb_users',
  IN_THE_AIR: 'tb_session',
  CAPTAIN_DOCUMENTS: 'tb_driver_documents',
  CITY_DOC: 'tb_city_documents',
  CITY_REQ_DOC: 'tb_required_documents',
  FLEET: 'tb_vehicle_fleet',
  CAPTAIN_BANK: 'tb_driver_bank_details',
  CITY: 'tb_cities',
  O_CITY: 'tb_operator_cities',
  PAYMENT_LOGS: 'tb_driver_payment_log',
  WALLET_NUMBER: 'tb_driver_wallet_number',
  GLOBAL_PROMO:'tb_ride_promotions'
};
