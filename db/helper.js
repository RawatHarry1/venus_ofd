const getDbPool = require('./connection').getDbPool;
const mysql = require('mysql2'); // For query escaping
const _this = this;
exports.executeQuery = async (dbName, query, params = []) => {
  const chalk = await import('chalk');
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

exports.insertIntoTable = async function (dbName, tableName, param) {
  try {
    const insertQuery = `INSERT INTO ${tableName} SET ?`;

    if (process.env.NODE_ENV === 'development') {
      console.log(`Generated Query: ${mysql.format(insertQuery, [param])}`);
    }

    return exports.executeQuery(dbName, mysql.format(insertQuery, [param]), []);
  } catch (error) {
    console.error(`Error inserting into ${tableName}:`, error.message);
    throw new Error('Database operation failed');
  }
};

exports.selectFromTable = async function (
  dbName,
  tableName,
  requiredKeys = ['*'],
  criteria = [],
  orderByCriteria = [],
  orderDesc = false,
  pagination = {},
) {
  const fields = requiredKeys.join(', ');
  let stmt = `SELECT ${fields} FROM ${tableName}`;
  const values = [];

  // WHERE clause
  if (criteria.length) {
    const whereClause = criteria
      .map((field) => {
        const operator = Array.isArray(field.value) ? 'IN (?)' : '= ?';
        values.push(field.value);
        return `${field.key} ${operator}`;
      })
      .join(' AND ');
    stmt += ` WHERE ${whereClause}`;
  }

  // ORDER BY clause
  if (orderByCriteria.length) {
    const orderClause = orderByCriteria.join(', ');
    stmt += ` ORDER BY ${orderClause} ${orderDesc ? 'DESC' : ''}`;
  }

  // Pagination
  if (pagination.limit) {
    stmt += ` LIMIT ?`;
    values.push(pagination.limit);
  }
  if (pagination.offset) {
    stmt += ` OFFSET ?`;
    values.push(pagination.offset);
  }
  return exports.executeQuery(dbName, stmt, values);
};
