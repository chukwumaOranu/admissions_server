const { executeQuery, testConnection, initializeDatabase } = require('./src/configs/db.config');
const fs = require('fs');
const path = require('path');

// Create database and tables using existing configuration
const setupDatabase = async () => {
  try {
    console.log('🔄 Starting database setup...');
    
    // Test connection first
    await testConnection();
    console.log('✅ Database connection successful');
    
    // Initialize database (create if doesn't exist)
    await initializeDatabase();
    console.log('✅ Database initialization completed');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, 'src/configs/admission-portal-schema-simple.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Reading schema file...');
    
    // Split the SQL file into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          await executeQuery(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          // Skip if table already exists
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} - Table already exists, skipping`);
          } else {
            console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }
    
    console.log('🎉 Database setup completed successfully!');
    
    // Verify tables were created
    const result = await executeQuery('SHOW TABLES');
    const tables = result.rows.map(row => Object.values(row)[0]);
    console.log(`📋 Created tables: ${tables.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
};

// Run the setup
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };
