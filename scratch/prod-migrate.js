/**
 * Production Database Migration Runner
 * 
 * Usage:
 *   node scratch/prod-migrate.js "<production-database-url>"
 */

const { execSync } = require('child_process');

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

try {
  console.log("\n1. Generating migration SQL files...");
  execSync("npx drizzle-kit generate", { stdio: 'inherit' });
  
  console.log("\n2. Applying migration structures to production host...");
  // Inject the database URL into the drizzle-kit runtime env
  execSync("npx drizzle-kit migrate", {
    env: {
      ...process.env,
      DATABASE_URL: targetUrl
    },
    stdio: 'inherit'
  });
  
  console.log("\n=========================================");
  console.log("✅ Migrations completed successfully!");
  console.log("=========================================");
} catch (error) {
  console.error("\n❌ Migration failed:");
  console.error(error.message);
  process.exit(1);
}
