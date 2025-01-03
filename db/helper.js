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

exports.selectFromTableInArray = async function (
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
        if (Array.isArray(field.value)) {
          const placeholders = field.value.map(() => '?').join(', ');
          values.push(...field.value);
          return `${field.key} IN (${placeholders})`;
        } else {
          values.push(field.value);
          return `${field.key} = ?`;
        }
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

exports.updateTable = async function (
  dbName,
  tableName,
  updateFields = {},
  criteria = [],
  orderByCriteria = [],
  orderDesc = false,
  limit = null,
) {
  // Ensure required parameters are provided
  if (!dbName || !tableName || Object.keys(updateFields).length === 0) {
    throw new Error(
      'Database name, table name, and update fields are required.',
    );
  }

  const setClause = Object.keys(updateFields)
    .map((key) => `${key} = ?`)
    .join(', ');
  const values = Object.values(updateFields);

  let stmt = `UPDATE ${tableName} SET ${setClause}`;

  // WHERE clause
  if (criteria && criteria.length) {
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
  if (orderByCriteria && orderByCriteria.length) {
    const orderClause = orderByCriteria.join(', ');
    stmt += ` ORDER BY ${orderClause} ${orderDesc ? 'DESC' : ''}`;
  }

  // Limit clause
  if (limit) {
    stmt += ` LIMIT ?`;
    values.push(limit);
  }

  try {
    return await exports.executeQuery(dbName, stmt, values);
  } catch (error) {
    console.error('Error executing updateTable:', error);
    throw new Error('Failed to execute update query.');
  }
};
