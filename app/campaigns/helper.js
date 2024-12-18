const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
} = require('../../bootstart/header');
const PromoConstant = require('../../constants/campaings');
function checkBlankAndZero(arr){
    for(var i in arr){
        if(arr[i] == 0){
            return 1;
        }
    }
   return checkBlank(arr);
}
function verifyLocationsCoordinates(handlerInfo, locationsCoordinates){
    try{
        var locationsCoordinates = JSON.parse(locationsCoordinates);
        if(locationsCoordinates.length < 1){
            throw Error("Empty locations coordinates.")
        }
        for (var location of locationsCoordinates){
            if(!location.lat || !location.lng){
                throw Error("Invalid locations coordinates.");
            }
        }
        return 1;
    }catch(error){
        return 0;
    }
}
exports.PROMO = {
    getDiscountType: (discountPercentage, cashbackPercentage, cappedFare, benefitType) => {
        if (discountPercentage == 100 || cashbackPercentage == 100 || cappedFare > 0) {
            return "FLAT";
        } else {
            return "PERCENTAGE";
        }
    },
    getDiscountValue: (cappedFare, cashbackPercentage, cashbackMaximum, discountPercentage, discountMaximum) => {
        let value = 0;
        if (cappedFare > 0) {
            value = cappedFare;
        } else if (cashbackPercentage > 0) {
            if (cashbackPercentage == 100) {
                value = cashbackMaximum;
            } else {
                value = cashbackPercentage;
            }
        } else if (discountPercentage > 0) {
            if (discountPercentage == 100) {
                value = discountMaximum;
            } else {
                value = discountPercentage;
            }
        }
        return value;
    },
    parseLocationsCoordinates: (locations_coordinates) => {
        let locationsArray = [];
        if (locations_coordinates == 0) {
            return locationsArray;
        }
        let tempLocationsArray = locations_coordinates.split(":");
        for (let location of tempLocationsArray) {
            location = location.split(",");
            locationsArray.push({
                lat: parseFloat(location[0]),
                lng: parseFloat(location[1])
            })
        }
        return locationsArray;
    },
    formatAllowedVehiclesString:function (allowedVehicles){

        if(allowedVehicles == 0) {
            return '';
        }    
        if (parseFloat(allowedVehicles) >= 0){
            var tempString = allowedVehicles.split("").sort().join("");
            if(PromoConstant.VEHICLE_COUPON[tempString]){
                return tempString;
            }else{
                loggingImp.error(handlerInfo, {ERROR: "Unknown allowedVehicles"});
                return '';
            }
        }else{
            loggingImp.error(handlerInfo, {ERROR: "Invalid allowedVehicles"});
            return '';
        }
    },
    isPromoValid: function (promoObj, promoOrCoupon){
        var allowedBenefitTypes = [PromoConstant.BENEFIT_TYPE.DISCOUNT, PromoConstant.BENEFIT_TYPE.CAPPED_FARE, PromoConstant.BENEFIT_TYPE.CASHBACK, PromoConstant.BENEFIT_TYPE.MARKETING_FARE, PromoConstant.BENEFIT_TYPE.SUBSCRIPTION_FARE];
        var allowedPromoType = [PromoConstant.PROMO_TYPE.LOCATION_INSENSITIVE, PromoConstant.PROMO_TYPE.PICK_UP_BASED, PromoConstant.PROMO_TYPE.DROP_BASED];
        var benefitType = +promoObj.benefit_type;
        var promoType = +promoObj.promo_type || +promoObj.coupon_type;
    
        if((allowedBenefitTypes.indexOf(benefitType) == -1) || (allowedPromoType.indexOf(promoType) == -1)){
            return 0;
        }
        switch (promoType) {
            case PromoConstant.PROMO_TYPE.LOCATION_INSENSITIVE:
                return 1;
    
            case PromoConstant.PROMO_TYPE.PICK_UP_BASED:
                if(promoOrCoupon == PromoConstant.PROMOTION_TYPE.PROMOS){
                    return (!checkBlankAndZero([promoObj.pickup_radius]) && verifyLocationsCoordinates(handlerInfo, promoObj.locations_coordinates));
                }else if(promoOrCoupon == PromoConstant.PROMOTION_TYPE.COUPONS){
                    return !checkBlankAndZero([promoObj.pickup_lat, promoObj.pickup_long, promoObj.pickup_radius]);
                }
                break;
    
            case PromoConstant.PROMO_TYPE.DROP_BASED:
                if(promoOrCoupon == PromoConstant.PROMOTION_TYPE.PROMOS){
                    return (!checkBlankAndZero([promoObj.drop_radius]) && verifyLocationsCoordinates(handlerInfo, promoObj.locations_coordinates));
                }else if(promoOrCoupon == PromoConstant.PROMOTION_TYPE.COUPONS){
                    // There's no DROP_BASED coupon for benefit_type=5
                    return (!checkBlankAndZero([promoObj.drop_lat, promoObj.drop_long, promoObj.drop_radius]) && benefitType != PromoConstant.BENEFIT_TYPE.MARKETING_FARE);
                }
                break;
        }
        return 0;
    },
    formatMultipleLocationsCoordinates: function (locationsCoordinates){
        var tempString = "";
        for(var location of locationsCoordinates){
            tempString += location.lat;
            tempString += ",";
            tempString += location.lng;
            tempString += ":"
        }
        return tempString.slice(0, -1);
    }
}
