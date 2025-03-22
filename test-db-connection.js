const mysql = require('mysql2');

// Database connection configuration
const connection = mysql.createConnection({
  host: 'db5017157692.hosting-data.io',
  user: 'dbu2641721',
  password: 'Edimbourg1023CCAA',
  database: 'dbs13787757',
  port: 3306
});

// Attempt to connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to the database.');
});

// Close the connection
connection.end();
