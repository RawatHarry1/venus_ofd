exports.ridesQueryHelper = async function (
  corporateId,
  driverId,
  fleetId,
  status,
) {
  return true;
};

exports.checkBlank = function(arr){
  var arrlength = arr.length;
  for (var i = 0; i < arrlength; i++)
  {
      if (arr[i] === '' || arr[i] === "" || arr[i] == undefined)
      {
          return 1;
      }
  }
  return 0;
}