const AdminMiddlewares = require('../admin/middelware');
const fleetController = require('./controllers/fleet');
const { generalConstants } = require('../../bootstart/header');


module.exports = function (app) {

  /* 
  Fleet API's
  */
  app.post(
    '/internal/create_fleet',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fleetController.createFleet,
  );
};
