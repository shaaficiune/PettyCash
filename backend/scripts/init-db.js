const { Client } = require('pg');
const { execSync } = require('child_process');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

// Extract database name and base connection details
// e.g., postgresql://postgres:password@localhost:5432/petty_cash_db?schema=public
const matches = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);

if (!matches) {
  console.error('DATABASE_URL is not in a recognized PostgreSQL format');
  process.exit(1);
}

const [_, user, password, hostPort, dbName] = matches;

async function run() {
  console.log(`Checking if database "${dbName}" exists...`);
  
  // Connect to the default 'postgres' database to check/create the target database
  const defaultUrl = `postgresql://${user}:${password}@${hostPort}/postgres`;
  const client = new Client({ connectionString: defaultUrl });

  try {
    await client.connect();
    
    // Check if the database exists
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      // Run CREATE DATABASE. Note: database names cannot be parameterized in this context, 
      // but since dbName is parsed from our own verified config, it is safe.
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Database is verified to exist. Run Prisma migrations or db push.
  try {
    console.log('Running Prisma schema push (db push)...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Prisma schema synchronized successfully.');
  } catch (err) {
    console.error('Prisma schema synchronization failed:', err.message);
    process.exit(1);
  }
}

run();
