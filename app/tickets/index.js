const TicketsController = require('./controllers/tickets');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.post(
    '/internal/fetch_support_tickets',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    TicketsController.getTicketList,
  );
  app.post(
    '/internal/update_support_ticket',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    TicketsController.updateTicket,
  );

  app.post(
    '/issue_tracker/get_cancelled_rides_issue_tags',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    TicketsController.getCancelledRidesIssueTags,
  );
};
