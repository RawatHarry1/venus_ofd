// bootstart/header.js

// Importing constants
const dbConstants = require('../constants/dbconstants');
const ResponseConstants = require('../constants/responesConstans');

// Importing helpers
/* const helpers = require('../helpers/index');  */
/* const middleware = require('../helpers/middleware'); */

// Importing database connections
const dbConnection = require('../db/connection');
const {
  executeQuery,
  insertIntoTable,
  selectFromTable,
  updateTable
} = require('../db/helper');
const dbQueries = require('../db/queries');

// Import other utilities or modules as needed
const errorHandler = require('../middlewares/errorHandler');
const responseHandler = require('../middlewares/responseHandler');
const authConstants = require('../constants/authConstants');
const rideConstants = require('../constants/rideConstants');
const generalConstants = require('../constants/general');

// Exporting everything as a single object
module.exports = {
  dbConstants,
  db: {
    connection: dbConnection,
    RunQuery: executeQuery,
    InsertIntoTable: insertIntoTable,
    SelectFromTable: selectFromTable,
    updateTable: updateTable,
    queries: dbQueries,
  },
  errorHandler,
  responseHandler,
  ResponseConstants,
  authConstants,
  rideConstants,
  generalConstants,
};
