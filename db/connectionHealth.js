const verifyDbConnections = async () => {
  if (!global.dbPools || Object.keys(global.dbPools).length === 0) {
    console.error(
      'No database pools initialized. Please check your .env configuration.',
    );
    return [
      {
        dbName: 'none',
        status: 'Failed',
        error: 'No database pools initialized.',
      },
    ];
  }

  console.log('Verifying database connections...');
  const results = [];

  for (const [dbName, pool] of Object.entries(global.dbPools)) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      results.push({ dbName, status: 'Connected' });
    } catch (error) {
      console.error(`Error connecting to ${dbName}:`, error.message);
      results.push({ dbName, status: 'Failed', error: error.message });
    }
  }

  return results;
};

module.exports = {
  verifyDbConnections,
};
