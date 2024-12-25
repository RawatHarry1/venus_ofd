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

exports.serverFlag = {
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

exports.rideType   =   {
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


exports.allowedRideTypesForVehicleSet = [
  exports.rideType.NORMAL,
  exports.rideType.OUTSTATION,
  exports.rideType.RENTAL,
  exports.rideType.DELIVERYV8
];

exports.fareType = {
  CUSTOMER : 0,
  DRIVER   : 1
};