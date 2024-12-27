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
};

exports.SERVER_FLAG = {
  AUTOS: 0,
  AUTH: 1
}

exports.CLIENTS = {
  VENUS_TAXI: 1,
  MARS: 2,
};

exports.CLIENTS_RIDE_TYPE = {
  VENUS_TAXI: 0,
  MARS: 10,
};

exports.LOGIN_TYPE   = {
  CUSTOMER: 0,
  DRIVER : 1
};

exports.RIDE_TYPE   =   {
  "NORMAL"    :   0,
  "PR"        :   1,
  "POOL"      :   2,
  "DELIVERY"  :   3,
  "DELIVERY POOL" : 4,
  "TRACKER"   :   5,
  "RENTAL"	:   6,
  "OUTSTATION":   7,
  "SHUTTLE"   :   8,
  "DELIVERYV8"  : 10,
};


exports.ALLOWED_RIDE_TYPES_FOR_VEHICLE_SET = [
  exports.RIDE_TYPE.NORMAL,
  exports.RIDE_TYPE.OUTSTATION,
  exports.RIDE_TYPE.RENTAL,
  exports.RIDE_TYPE.DELIVERYV8
];

exports.FARE_TYPE = {
  CUSTOMER : 0,
  DRIVER   : 1
};

exports.USER_GENDER = {
  MALE            : 1,
  FEMALE          : 2,
  OTHERS          : 3
};

exports.DOCUMENT_TYPES = {
  NORMAL        :   0,
  IMAGE         :   1,
  BRANDING      :   2,
  DRIVER_TEST   :   3,
  VEHICLE_IMAGE :   4
};

exports.DRIVER_DOCUMENTS_IS_REQUIRED = {
  OPTIONAL           : 0,
  MANDATORY_DRIVE    : 1,
  MANDATORY_REGISTER : 3,
  POST_DRIVING       : 4,
  QUASI_STATE        : 5,
  DRIVER_BRANDING    : 6,
  MAP_IMAGES         : 7
};

exports.CITIES = {
  DEFAULT_CITY_ID: 0
}

exports.STATUS = {
  ACTIVE : 1,
  INACTIVE: 0
}