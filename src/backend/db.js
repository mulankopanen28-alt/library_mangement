import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  const conn = await pool.getConnection();
  console.log('Connected to MySQL!');
  conn.release();
} catch (err) {
  console.error('DB Connection Failed:', err.message);
}

export default pool;