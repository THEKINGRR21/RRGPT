/**
 * Production Database Migration Runner
 * 
 * Usage:
 *   node scratch/prod-migrate.js "<production-database-url>"
 */

const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const targetUrl = process.argv[2];

if (!targetUrl) {
  console.error("Error: Missing database connection string.");
  console.log("Usage: node scratch/prod-migrate.js \"postgresql://user:password@host/dbname?sslmode=require\"");
  process.exit(1);
}

console.log("=========================================");
console.log("   Running Production Database Migrations");
console.log("=========================================");
console.log("Database Host:", targetUrl.split('@')[1]?.split('/')[0] || "Remote Host");

(async () => {
  // Initialize connection with SSL required
  const sql = postgres(targetUrl, { ssl: 'require' });
  
  try {
    console.log("\n1. Reading migration SQL file...");
    const migrationPath = path.join(__dirname, '../drizzle/0000_purple_nomad.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log("2. Splitting SQL migration into individual statements...");
    // Split by semicolon, filter empty lines, and ignore standalone comments
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('-->'));

    console.log(`Found ${statements.length} SQL statements to execute.`);

    console.log("\n3. Executing statements sequentially...");
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await sql.unsafe(stmt);
      } catch (err) {
        console.error(`\n❌ Error executing SQL statement ${i + 1}:`);
        console.error(`Query: ${stmt}`);
        throw err;
      }
    }
    
    console.log("\n=========================================");
    console.log("✅ Migrations completed successfully!");
    console.log("=========================================");
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error.stack || error.message || error);
  } finally {
    await sql.end();
  }
})();
