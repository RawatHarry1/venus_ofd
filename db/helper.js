const getDbPool = require('./connection').getDbPool;

// Use dynamic import to load chalk
const executeQuery = async (dbName, query, params = []) => {
  const chalk = await import('chalk'); // Dynamic import

  try {
    const pool = getDbPool(dbName);
    const connection = await pool.getConnection();

    // Log query in development environment with colorful logs
    if (process.env.NODE_ENV === 'development') {
      console.log(
        chalk.default.blue(`Executing query on ${chalk.default.bold(dbName)}:`),
      ); // DB name in blue with bold
      console.log(
        chalk.default.green('SQL Query: ') + chalk.default.yellow(query),
      ); // SQL query in yellow
      console.log(
        chalk.default.green('Parameters: ') +
          chalk.default.cyan(JSON.stringify(params)),
      ); // Parameters in cyan
    }

    try {
      const [rows] = await connection.execute(query, params);
      return rows; // Return query results
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(
      chalk.default.red(`Database operation failed on '${dbName}':`),
      chalk.default.red(error.message || error),
    ); // Error in red
    throw new Error('Database operation failed');
  }
};

module.exports = executeQuery;
