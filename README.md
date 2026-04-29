# 🔐 CSC429 | Secure Web Application Project

A secure web application designed to demonstrate detection and mitigation of common security vulnerabilities.

---

## 👩‍💻 Team Members
- Dimah Althunayan  
- Shmookh Almoliafai
- Raghad Baselm
- Jood Alotaibi 

---

## 💡 Project Overview

This project implements a user management system with a focus on web security.

The application allows users to:
- Register an account  
- Login securely  
- Access a personal dashboard  

Additionally, the system demonstrates common vulnerabilities first, then shows how they are fixed and secured.

---

## 🎯 Project Objectives

- Build a functional web application (Register, Login, Dashboard)  
- Identify security vulnerabilities  
- Apply secure coding practices  
- Protect the system using modern security techniques  

---

## 🧩 Features

- User Registration & Login system  
- Dashboard after authentication  
- Role-based access (Admin / User)  
- Secure password handling  
- Input validation and sanitization  

---

## ⚠️ Vulnerabilities Implemented

The application initially includes the following vulnerabilities:

- SQL Injection  
- Weak Password Storage  
- Cross-Site Scripting (XSS)  
- Broken Access Control  

---

## 🛡️ Security Fixes (Mitigation)

- SQL Injection
  - Fixed using parameterized queries  

- Password Security
  - Replaced weak hashing with bcrypt  

- XSS Protection
  - Input sanitization implemented  

- Access Control
  - Role-Based Access Control (RBAC) added  

- Encryption
  - Sensitive data protected (session secret stored in environment variables)  
  - Secure communication (HTTPS implemented via self-signed certificate)  

---

## 🛠️ Technologies Used

- Node.js  
- Express.js  
- SQLite
- bcrypt  
- HTML  
- CSS  
- JavaScript  

---

## ▶️ How to Run the Project

Follow these steps to run the project locally:

1. Download or clone the repository:  
   git clone <your-repo-url>

2. Open the project folder in your preferred code editor.

3. Install the required dependencies:  
   npm install

4. Create a .env file in the root directory containing only:
  SESSION_SECRET=your_random_secret_here

5. Start the server:  
   npm start

6. Open your browser and go to:  
   https://localhost:3000

The application should now be running.
