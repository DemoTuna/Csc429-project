// server.js Is The Main Entry Point

/* What this file do:
- starts the web server using Express
- connects the pages with the database
- handles register, login, dashboard, and logout
*/

// Import the tools needed for the server and session and paths 
const express = require('express'); // helps us build the web app (routes, pages, server
const session = require('express-session'); // remembers the user after login
const path = require('path'); //  helps find files like html pages

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
    secret: 'csc429-session-secret-key',     // secret key used to protect session data (like a password for sessions)
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


// same as requireLogin but used for API requests (returns error instead of redirect)
// used when the page is asking for data (API request, not opening a page)
function requireLoginAPI(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
}


// Each route handles a specific URL path and HTTP method


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
        // Look up the user by username and password in the database
        const rows = await db.query(sql`
            SELECT * FROM users
            WHERE username = ${username} AND password = ${password}
        `);

        const user = rows[0]; // Get the first (and only) matching user

        if (user) { // if it exists then

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

        // Insert the new user and role is locked to 'user', not from form input ( we do not want user to decide his\her role)
        await db.query(sql`
            INSERT INTO users (full_name, email, username, password, role)
            VALUES (${full_name}, ${email}, ${username}, ${password}, 'user')
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



// GET /logout then Destroy the session and redirect to login
app.get('/logout', (req, res) => {
    req.session.destroy(() => {  // Destroy the session
        res.redirect('/login');
    });
});

// INITIALIZE DATABASE, THEN START THE SERVER
// We must wait for the database to be ready before accepting
(async () => {
    try {
        await initDatabase(); // Set up tables and add admin user

        app.listen(PORT, () => {
            console.log(`Server running at : http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('[Startup Error] Failed to initialize the database:', err);
        process.exit(1);
    }
})();
