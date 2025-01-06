exports.authPromotionBonusType = {
  CASH: 0,
  COUPON: 1,
};

exports.PROMO_TYPE = {
  LOCATION_INSENSITIVE: 1,
  PICK_UP_BASED: 2,
  DROP_BASED: 3,
};

exports.BENEFIT_TYPE = {
  DISCOUNT: 1,
  CAPPED_FARE: 2,
  CASHBACK: 3,
  MARKETING_FARE: 5,
};
exports.PROMOTION_TYPE = {
  PROMOS: 1,
  COUPONS: 2,
};
exports.PROMOTION_EVENT = {
  CREATED: 1,
  UPDATED: 2,
  GIVEN_TO_USER: 3,
  REMOVED_FOR_USER: 4,
};
exports.VEHICLE_COUPON = {
  0: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  1: [1],
  2: [2],
  3: [3],
  4: [4],
  5: [5],
  6: [6],
  7: [7],
  12: [1, 2],
  13: [1, 3],
  23: [2, 3],
  36: [3, 6],
  15: [1, 5],
};

exports.BENEFIT_TYPE_BUSINESS_FARE = {
  [this.BENEFIT_TYPE.MARKETING_FARE]: 4,
  [this.BENEFIT_TYPE.SUBSCRIPTION_FARE]: 5,
  DEFAULT: 1,
};
