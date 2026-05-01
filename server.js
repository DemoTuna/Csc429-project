// server.js Is The Main Entry Point

/* What this file do:
- starts the web server using Express
- connects the pages with the database
- handles register, login, dashboard, and logout
*/

// Load environment variables from .env file (for session key)
require('dotenv').config();

// Import the tools needed for the server and session and paths 
const express = require('express'); // helps us build the web app (routes, pages, server
const session = require('express-session'); // remembers the user after login
const path = require('path'); //  helps find files like html pages
const https = require('https'); // to create HTTPS server for encrypted communication
const fs = require('fs'); // reads certificate files (key.pem and cert.pem)
const bcrypt = require('bcrypt'); // Import bcrypt library for secure password hashing
// Import the database connection and the setup function initDatabase() from database.js
const { db, sql, initDatabase } = require('./database');

// Create the Express app and choose the port                                    
const app = express();
const PORT = 3000;

// These help Express read form data, JSON data, and CSS files 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));


// Session is used to remember the user after login
app.use(session({
    secret: process.env.SESSION_SECRET,     // secret key used to protect session data (like a password for sessions)
    resave: false,                          // don’t save session again if nothing changed 
    saveUninitialized: false,              // don’t create session until user actually logs in
    cookie: {
        maxAge: 1000 * 60 * 60             // Cookie expires after 1 hour
        //        ms  sec  min
    }
}));



// If the user is not logged in redirect them to login page
// used when user tries to open a page (like dashboard)
function requireLogin(req, res, next) {
    if (req.session && req.session.user) { // if the session exists AND it has a user inside it
        next(); // Authenticated so allow the request to continue
    } else {
        res.redirect('/login'); // Not logged in so redirect to login page
    }
}


function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        next(); // allow
    } else {
        res.status(403).sendFile(path.join(__dirname, 'views', 'access-denied.html'));
    }
}


// same as requireLogin but used for API requests (returns error instead of redirect)
// used when the page is asking for data (API request, not opening a page)
function requireLoginAPI(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
}
function sanitizeInput(input) {
    let clean = input.replace(/<[^>]*>/g, '');
    clean = clean.replace(/on\w+\s*=\s*["']?[^"']*["']?/gi, '');
    clean = clean.replace(/javascript:/gi, '');
    clean = clean.replace(/[<>]/g, '');

    return clean;
}

// Each route handles a specific URL path and HTTP method
app.get('/admin', requireLogin, requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// GET /  (which is HOME) then redirect to login
app.get('/', (req, res) => {
    res.redirect('/login');
});


// LOGIN
// GET /login then Show the login page
app.get('/login', (req, res) => {
    // If the user already has an active session then skip login
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    // If not logged in then show the actual login.html file which is in views folder
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});


// POST /login  →  Handle the login form submission
// This will takes the username and password from the form and checks if they exist in the database
app.post('/login', async (req, res) => { // When user submits login form then run this code
    const { username, password } = req.body; // get data from the form 

    try {

        // Look up the user by username only
        const rows = await db.query(sql`
            SELECT * FROM users
            WHERE username = ${username}
        `);

        const user = rows[0]; // Get the first (and only) matching user


        // Compare the entered password with the hashed password in the database
        // bcrypt.compare returns true only if they match
        const passwordMatches = user && await bcrypt.compare(password, user.password);

        if (passwordMatches) {

            // Save user info in the session (we never store the password)
            req.session.user = {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                username: user.username,
                role: user.role
            };
            res.redirect('/dashboard');

        } else {
            // Invalid credentials then redirect back with an error in the URL
            res.redirect('/login?error=Invalid+username+or+password');
        }

    } catch (err) {
        // if something breaks database error or something else then
        res.redirect('/login?error=Something+went+wrong.+Please+try+again.');
    }
});


// GET /register then Show the registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});


// POST /register then Handle the registration form submission
app.post('/register', async (req, res) => {
    const { full_name, email, username, password } = req.body; // get data from the form

    try {
        // Check whether the username or email is already in use
        const existing = await db.query(sql`
            SELECT id FROM users
            WHERE username = ${username} OR email = ${email}
        `);

        if (existing.length > 0) { // Invalid credentials ( username or email is already taken ) then redirect back with an error in the URL
            return res.redirect('/register?error=Username+or+email+is+already+taken');
        }

        // Hash the password before saving it (more secure than plain text)
        // NOTE: previously passwords were stored in plain text (weak security)
        // Now passwords are securely hashed using bcrypt before storage
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user and role is locked to 'user', not from form input ( we do not want user to decide his\her role)
        await db.query(sql`
            INSERT INTO users (full_name, email, username, password, role)
            VALUES (${full_name}, ${email}, ${username}, ${hashedPassword}, 'user')
        `);

        // Redirect to login with a success message
        res.redirect('/login?success=Account+created!+You+can+now+sign+in.');

    } catch (err) {
        // if something breaks database error or something else then
        res.redirect('/register?error=Registration+failed.+Please+try+again.');
    }
});



// GET /dashboard then Show the dashboard page (protected)
// requireLogin middleware checks session before serving the page
app.get('/dashboard', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// GET /api/user then Return logged-in user's data as JSON 
// Called by dashboard.html via JavaScript fetch() to populate the UI // so it is not a page it is for javaScript inside dashboarde
app.get('/api/user', requireLoginAPI, (req, res) => {
    res.json(req.session.user);
});

app.get('/api/users', requireLogin, requireAdmin, async (req, res) => {
    try {
        const users = await db.query(sql`
            SELECT username, email, role FROM users
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/delete-user', requireLogin, requireAdmin, async (req, res) => {
    try {
        const username = req.body.username;

        if (username === 'admin') {
            return res.json({ message: 'Cannot delete admin' });
        }

        await db.query(sql`
            DELETE FROM users WHERE username = ${username}
        `);

        res.json({ message: 'User deleted successfully' });

    } catch (err) {
        res.status(500).json({ message: 'Error deleting user' });
    }
});



// GET /logout then Destroy the session and redirect to login
app.get('/logout', (req, res) => {
    req.session.destroy(() => {  // Destroy the session
        res.redirect('/login');
    });
});
// GET /comments — show the comments page (protected)
app.get('/comments', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'comments.html'));
});

// GET /api/comments — fetch all comments from database
app.get('/api/comments', requireLogin, async (req, res) => {
    try {
        const rows = await db.query(sql`SELECT id, username, comment FROM comments`)
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// POST /api/comments — save a new comment after sanatize it.
app.post('/api/comments', requireLogin, async (req, res) => {
    try {
        const { comment } = req.body;
        const username = req.session.user.username;
        const cleanComment = sanitizeInput(comment);
        await db.query(sql`
            INSERT INTO comments (username, comment)
            VALUES (${username}, ${cleanComment})
        `);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});
app.post('/api/delete-comment', requireLogin, async (req, res) => {
    try {
        const { id } = req.body;
        const username = req.session.user.username;
        const role = req.session.user.role;

        // Only allow admin or the comment owner to delete
        if (role === 'admin') {
            await db.query(sql`DELETE FROM comments WHERE id = ${id}`);
        } else {
            await db.query(sql`DELETE FROM comments WHERE id = ${id} AND username = ${username}`);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});


// INITIALIZE DATABASE, THEN START THE SERVER
// We must wait for the database to be ready before accepting
(async () => {
    try {
        await initDatabase(); // Set up tables and add admin user

        https.createServer({
            key: fs.readFileSync('key.pem'),
            cert: fs.readFileSync('cert.pem')
        }, app).listen(PORT, () => {
            console.log(`Server running at : https://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('[Startup Error] Failed to initialize the database:', err);
        process.exit(1);
    }
})();
