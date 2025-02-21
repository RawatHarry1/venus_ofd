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

  app.get(
    '/internal/fetch_fleets',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fleetController.fetchFleetList,
  );

  app.post(
    '/internal/edit_fleet',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fleetController.editFleet,
  );

  app.post(
    '/internal/delete_fleet',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fleetController.deleteFleet,
  );
};
