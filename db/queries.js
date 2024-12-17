const executeQuery = require('./helper');

// Example for getting data
const getUsers = async () => {
  try {
    // Use helper to fetch data from DB1
    const rows = await executeQuery('db1', 'SELECT * FROM users');
    return rows;
  } catch (error) {
    console.error('Error fetching users:', error.message || error);
    throw error;
  }
};

// Example for creating a user
const createUser = async (userData) => {
  try {
    const { name, email } = userData;
    // Use helper to insert data into DB2
    const result = await executeQuery(
      'db2',
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email],
    );
    return result;
  } catch (error) {
    console.error('Error creating user:', error.message || error);
    throw error;
  }
};

// Example for updating user data
const updateUser = async (userId, userData) => {
  try {
    const { name, email } = userData;
    // Use helper to update data in DB1
    const result = await executeQuery(
      'db1',
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email, userId],
    );
    return result;
  } catch (error) {
    console.error('Error updating user:', error.message || error);
    throw error;
  }
};

// Example for deleting a user
const deleteUser = async (userId) => {
  try {
    // Use helper to delete data from DB2
    const result = await executeQuery('db2', 'DELETE FROM users WHERE id = ?', [
      userId,
    ]);
    return result;
  } catch (error) {
    console.error('Error deleting user:', error.message || error);
    throw error;
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
