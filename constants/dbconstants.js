/* exports.tables ={
    ACL_USER:'tb_acl_users'
} */
exports.DBS = {
  ADMIN_AUTH: 'venus_acl',
  LIVE_DB: 'venus_live',
  LIVE_LOGS: 'venus_live_addn',
  AUTH_DB: 'venus_auth'
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
  CITY_REGIONS: 'tb_city_sub_regions',
  CITY_REQ_DOC: 'tb_required_documents',
  FLEET: 'tb_vehicle_fleet',
  CAPTAIN_BANK: 'tb_driver_bank_details',
  CITY: 'tb_cities',
  O_CITY: 'tb_operator_cities',
  PAYMENT_LOGS: 'tb_driver_payment_log',
  WALLET_NUMBER: 'tb_driver_wallet_number',
  GLOBAL_PROMO: 'tb_ride_promotions',
  PROMOTION_LOGS: 'tb_promotion_logs',
  TICKETS: 'tb_support_tickets',
  VEHICLES: 'tb_vehicles',
  SUB_REGIONS: 'tb_city_sub_regions',
  COUNTRY: 'tb_countries',
  VEHICLE_MAKE: 'tb_vehicle_make',
  VEHICLE_SETS: 'tb_vehicle_sets',
  VEHICLE_FARE: 'tb_fare',
  VEHICLE_RENTAL: 'tb_rental_packages',
  BUSINESS_USER: 'tb_business_users',
};

exports.LIVE_LOGS = {
  CITIES: 'tb_cities',
  SUSPEND_LOGS:'tb_driver_suspension_logs',
  SUSPEND_REASON:'tb_driver_suspension_reasons',
  CASE_LOGS:'tb_case_logs',
  REFOUND_REQUESTS:'tb_csp_refund_requests'
};
