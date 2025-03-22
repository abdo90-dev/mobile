// server.js

require('dotenv').config(); // Charge les variables d'environnement depuis .env

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Créer un pool de connexion à MySQL en utilisant les variables d'environnement
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000  // 10 secondes par exemple
});
pool.getConnection()
  .then(conn => {
    console.log('✅ Connexion MySQL réussie !');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MySQL:', err.message);
  });

// Exemple d'endpoint : récupérer la liste des utilisateurs
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
app.get('/', (req, res) => {
    res.send('Hello, backend is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(3002, '0.0.0.0', () => {
  console.log('Server started on 0.0.0.0:3002');
});