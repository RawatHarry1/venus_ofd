exports.DASHBOARD_RIDE_STATUS = {
  ONGOING: 1,
  COMPLETED: 2,
  MISSED: 3,
  CANCELLED_RIDES: 4,
  CANCELLED_REQUESTS: 5,
};
exports.ENGAGEMENT_STATUS = {
  REQUESTED: 0,
  ACCEPTED: 1,
  STARTED: 2,
  ENDED: 3,
  REJECTED_BY_DRIVER: 4,
  CANCELLED_BY_CUSTOMER: 5,
  TIMEOUT: 6,
  ACCEPTED_BY_OTHER_DRIVER: 7,
  ACCEPTED_THEN_REJECTED: 8,
  CLOSED: 9,
  CANCELLED_ACCEPTED_REQUEST: 10,
  RIDE_ENDED_BY_CRONE: 11,
  ARRIVED: 14,
  RIDE_CANCELLED_BY_CUSTOMER: 13,
  DRIVER_ARRIVED: 14,
};

exports.SERVER_FLAG = {
  AUTOS: 0,
  AUTH: 1,
};

exports.CLIENTS = {
  VENUS_TAXI: 1,
  MARS: 2,
};

exports.CLIENTS_RIDE_TYPE = {
  VENUS_TAXI: 0,
  MARS: 10,
};

exports.LOGIN_TYPE = {
  CUSTOMER: 0,
  DRIVER: 1,
};

exports.RIDE_TYPE = {
  NORMAL: 0,
  PR: 1,
  POOL: 2,
  DELIVERY: 3,
  'DELIVERY POOL': 4,
  TRACKER: 5,
  RENTAL: 6,
  OUTSTATION: 7,
  SHUTTLE: 8,
  DELIVERYV8: 10,
};

exports.ALLOWED_RIDE_TYPES_FOR_VEHICLE_SET = [
  exports.RIDE_TYPE.NORMAL,
  exports.RIDE_TYPE.OUTSTATION,
  exports.RIDE_TYPE.RENTAL,
  exports.RIDE_TYPE.DELIVERYV8,
];

exports.FARE_TYPE = {
  CUSTOMER: 0,
  DRIVER: 1,
};

exports.USER_GENDER = {
  MALE: 1,
  FEMALE: 2,
  OTHERS: 3,
};

exports.DOCUMENT_TYPES = {
  NORMAL: 0,
  IMAGE: 1,
  BRANDING: 2,
  DRIVER_TEST: 3,
  VEHICLE_IMAGE: 4,
};

exports.DRIVER_DOCUMENTS_IS_REQUIRED = {
  OPTIONAL: 0,
  MANDATORY_DRIVE: 1,
  MANDATORY_REGISTER: 3,
  POST_DRIVING: 4,
  QUASI_STATE: 5,
  DRIVER_BRANDING: 6,
  MAP_IMAGES: 7,
};

exports.CITIES = {
  DEFAULT_CITY_ID: 0,
};

exports.STATUS = {
  ACTIVE: 1,
  INACTIVE: 0,
};

exports.CANCELLATION_REFUND = {
  NA: 0,
  ON_COMPLAINT: 1,
  ON_CALL: 2,
  NO_REFUND: 3,
};

exports.USER_DETAIL_SEARCH_KEY = {
  USER_ID: 0,
  USER_EMAIL: 1,
  USER_PHONE: 2,
};

exports.DRIVER_DETAIL_SEARCH_KEY = {
  DRIVER_ID: 0,
  DRIVER_PHONE: 2,
  DRIVER_AUTO_NO: 1,
};

exports.SCHEDULE_STATUS = {
  IN_QUEUE: 0,
  IN_PROCESS: 1,
  PROCESSED: 2,
  CANCELLED: 3,
};

exports.COMMUNICATION_MEDIUM = {
  PUSH: 0,
  SMS: 1,
  MKT_PUSH: 3,
  MKT_SMS: 4,
  EMAIL: 2,
};

exports.SERVERS = {
  AUTOS_SERVER: 'https://chuki-rides.venustaxi.in',
  MERCHANT_SERVER: 'https://super-app-franchise.venustaxi.in',
};

exports.MERCHANT_SERVER_ENDPOINT = {
  FETCH_ALL_SUBSCRIPTIONS: '/api/subscriptions/get_all_subscriptions',
  CREATE_SUBSCRIPTION: '/api/subscriptions/create_subscription',
  UPDATE_SUBSCRIPTION: '/api/subscriptions/update_subscription',
  DELETE_SUBSCRIPTION: '/api/subscriptions/delete_subscription',
  CREATE_FRANCHISEE_FROM_PANEL: '/api/franchisee/create_franchisee_from_panel',
  UPDATE_FRANCHISEE: '/api/franchisee/update',
  DELETE_FRANCHISEE: '/api/franchisee/delete',
  LIST_FRANCHISEES: '/api/franchisee/list',
  SIGNUP_FRANCHISEE: '/api/franchisee/signup',
  CHANGE_PASSWORD: '/api/franchisee/change_password',
  RESET_PASSWORD: '/api/franchisee/reset_password',
  LOGIN_FRANCHISEE: '/api/franchisee/login',
};

exports.AUTOS_SERVERS_ENDPOINT = {
  SEND_PUSH_DRIVER: '/send_push_from_autos',
  FARE_ESTIMATE: '/partner/fare_estimate',
  FIND_DRIVERS: '/getFareEstimate',
  REQUEST_RIDE: '/partners_api/request_ride',
  CANCEL_RIDE: '/cancelTheTrip',
  FETCH_REQUIRED_DOCS: '/fetchRequiredDocs',
  UPDATE_DOCS: '/driver/panel/v2/update_document_status',
  SEND_LOGIN_OTP: '/customer/sendLoginOtp',
  VERIFY_OTP: '/customer/verifyOtp',
  CUSTOMER_PROFILE: '/customer/profile',
  SEND_WALLET_NOTIFICATIONS: '/send_wallet_notification',
};

exports.VEHILCE_TYPE = {
  AUTOS: 1,
  BIKES: 2,
  TAXI: 3,
  MINI_TRUCK: 4,
  E_RICK: 5,
  OTHER: 6,
};

// Define default icon sets
exports.DEFAULT_ICON_SET = {
  AUTO: 'ORANGE AUTO',
  BIKE: 'ORANGE BIKE',
  TAXI: 'YELLOW TAXI',
  HELICOPTER: 'HELICOPTER',
  E_RICK: 'E-RICK',
};

// Define icon set mapping for vehicle types
exports.ICON_SET_VEHICLE_MAP = {
  [exports.VEHILCE_TYPE.AUTOS]: 'YELLOW AUTO',
  [exports.VEHILCE_TYPE.BIKES]: 'RED BIKE',
  [exports.VEHILCE_TYPE.TAXI]: 'YELLOW CAR',
  [exports.VEHILCE_TYPE.MINI_TRUCK]: 'RED AUTO',
  [exports.VEHILCE_TYPE.E_RICK]: 'E-RICK',
};

exports.BID_CONFIG = {
  AUTO_ACCEPT: 1,
  AUTO_ACCEPT_AND_EARLY_TERM: 2,
  AUTO_CANCEL: 3,
};

exports.USER_STATUS = {
  FREE: 0,
  BUSY: 1,
};

exports.SESSION_STATUS = {
  INACTIVE: 0,
  ACTIVE: 1,
  TIMED_OUT: 2,
};

exports.DOCUMENT_STATUS = {
  APPROVED: 3,
  PENDING: 1,
  REJECTED: 2,
  UPLOADED: 4,
  NOT_UPLOADED: 0,
  EXPIRED: 5,
};

exports.BLOCK_USER_FLAGS = {
  PASSWORD_TO_BLOCK_USER: '',
  BLOCK_USER: 0,
  UNBLOCK_USER: 1,
};

exports.REFFERAL_BONUS_TYPE = {
  CREDIT: 0,
  COUPON: 1,
  NONE: 2,
};

exports.DEVICE_TYPE = {
  ANDROID: 0,
  iOS: 1,
  TRACKER: 6,
  BL10_GPSLOCK: 6,
};

exports.DELIVERY_PACKAGE_STATUS = {
  REQUESTED: 0,
  PACKAGE_PICKED: 1,
  STARTED: 2,
  PACKAGE_DELIVERY_FAILED: 3,
  PACKAGE_DELIVERED_SUCCESSFULLY: 4,
  PACKAGE_PICKUP_FAILED: 5,
};

exports.RENTAL_FARE_FACTOR = {
  HOURLY: 1,
  DAILY: 2,
  MONTHLY: 3,
};

// exports.DRIVER_DOCUMENT_TYPE = {
//   MAP_IMAGES: 7,
//   DRIVER_BRANDING: 6,
//   QUASI_STATE: 5,
//   POST_DRIVING: 4,
//   MANDATORY_REGISTER: 3,
//   MANDATORY_DRIVE: 1,
//   OPTIONAL: 0,
// };
