const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envName = process.env.NODE_ENV || 'development';
const envCandidates = [
  path.resolve(__dirname, `../../.env.${envName}`),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'deepflux_admissions',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('📊 Database connection established');
    
    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database test query successful:', rows[0]);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  try {
    const [result, fields] = await pool.execute(query, params);

    // If it's an OkPacket (INSERT/UPDATE/DELETE), return it directly
    if (result && typeof result.insertId !== 'undefined') {
      return result; // includes insertId, affectedRows, etc.
    }

    // Otherwise it's a SELECT
    return { rows: result, fields };
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

// Execute transaction
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [rows] = await connection.execute(query, params);
      results.push(rows);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Get connection from pool
const getConnection = async () => {
  return await pool.getConnection();
};

// Close all connections
const closePool = async () => {
  await pool.end();
};

// Database initialization
const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    
    // Create database if it doesn't exist
    const createDbQuery = `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
    await executeQuery(createDbQuery);
    
    console.log('✅ Database initialization completed');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  getConnection,
  closePool,
  initializeDatabase
};
