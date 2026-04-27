
/* What does this file do ?
- It creates database folder and database file (app.db) if missing
- It creates users table if missing and add admin record if missing
*/

// Import the tools needed for SQLite and file paths and folders
const createDatabase = require('@databases/sqlite');
const { sql } = require('@databases/sqlite'); // { sql } means only give me the sql part
const path = require('path');
const fs = require('fs');

// Make sure the database folder exists before saving app.db inside it
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

// Open the SQLite database file, or create it if it does not exist
const db = createDatabase(path.join(dbDir, 'app.db'));


// This function prepares the database when the server starts and creates the users table and add the default admin account
async function initDatabase() {
    // Create the users table if it does not already exist
    // await means wait until this finish 
    await db.query(sql`
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT    NOT NULL,
            email     TEXT    NOT NULL UNIQUE,
            username  TEXT    NOT NULL UNIQUE,
            password  TEXT    NOT NULL,
            role      TEXT    NOT NULL DEFAULT 'user'
        )
    `);

    // Check if the default admin account already exists
    const existing = await db.query(sql`
        SELECT id FROM users WHERE username = 'admin'
    `);
    // if it does not exists admin will be added manually
    if (existing.length === 0) {
        await db.query(sql`
            INSERT INTO users (full_name, email, username, password, role)
            VALUES ('Admin User', 'admin@example.com', 'admin', 'admin123', 'admin')
        `);
    }
}

// Share the database connection and the setup function initDatabase() with the server.js
module.exports = { db, sql, initDatabase };
