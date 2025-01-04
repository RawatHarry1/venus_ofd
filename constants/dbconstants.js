/* exports.tables ={
    ACL_USER:'tb_acl_users'
} */
exports.DBS = {
  ADMIN_AUTH: 'venus_acl',
  LIVE_DB: 'venus_live',
  LIVE_LOGS: 'venus_live_addn',
  AUTH_DB: 'venus_auth',
};
exports.ADMIN_AUTH = {
  ACL_USER: 'tb_acl_users',
  TOKENS: 'tb_acl_tokens',
};
exports.AUTH_DB = {
  AUTH_OPERATORS: 'tb_operator_cities',
  TNX: 'tb_wallet_transactions',
  AUTH_USERS: 'tb_users',
  PENDING_TNX: 'tb_pending_wallet_txns',
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
  BANNERS_TYPE: 'banner_types',
  BANNERS: 'banners',
  SCHEDULE_RIDE: 'tb_schedules',
  VEHICLE_MAPPING: 'tb_driver_vehicle_mapping',
};

exports.LIVE_LOGS = {
  CITIES: 'tb_cities',
  SUSPEND_LOGS: 'tb_driver_suspension_logs',
  SUSPEND_REASON: 'tb_driver_suspension_reasons',
  CASE_LOGS: 'tb_case_logs',
  REFOUND_REQUESTS: 'tb_csp_refund_requests',
  ISSUE: 'tb_issue_tags',
  ISSUE_CATEGORY: 'tb_issue_categories',
  CREDIT_LOGS: 'tb_user_recharge_credits',
};
