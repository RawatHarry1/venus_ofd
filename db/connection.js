const mysql = require('mysql2/promise');

// Function to create database pools dynamically
const createPools = () => {
  const dbConfigs = [];
  let index = 1;

  while (process.env[`DB${index}_HOST`]) {
    dbConfigs.push({
      name: process.env[`DB${index}_NAME`],
      config: {
        host: process.env[`DB${index}_HOST`],
        user: process.env[`DB${index}_USER`],
        password: process.env[`DB${index}_PASSWORD`],
        database: process.env[`DB${index}_NAME`],
        waitForConnections: true,
        connectionLimit: parseInt(
          process.env[`DB${index}_CONNECTION_LIMIT`] || 10,
          10,
        ),
      },
    });
    index++;
  }

  if (dbConfigs.length === 0) {
    console.error('No database configurations found in .env.');
    return {};
  }

  const pools = {};
  dbConfigs.forEach(({ name, config }) => {
    pools[name] = mysql.createPool(config);
  });

  return pools;
};

// Initialize global database pools
global.dbPools = createPools();

module.exports = {
  getDbPool: (dbName) => {
    const pool = global.dbPools[dbName];
    if (!pool) throw new Error(`Database pool for '${dbName}' not found.`);
    return pool;
  },
};
