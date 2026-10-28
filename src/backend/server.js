
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// =====================================
// HOME
// =====================================
app.get('/', (req, res) => {
  res.send('Limkokwing Library Backend is running!');
});

// =====================================
// TEST MYSQL CONNECTION
// =====================================
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DATABASE() AS databaseName'
    );

    res.json({
      success: true,
      message: 'Connected to MySQL!',
      database: rows[0].databaseName,
    });
  } catch (err) {
    console.error('Database connection error:', err);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: err.message,
    });
  }
});

// =====================================
// GET ALL BOOKS
// =====================================
app.get('/api/books', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        book_id,
        title,
        author,
        isbn,
        category,
        quantity,
        available,
        category AS genre
      FROM books
      ORDER BY book_id DESC
    `);

    console.log('Books fetched:', rows.length);

    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch books:', err);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch books',
      error: err.sqlMessage || err.message,
      code: err.code || null,
    });
  }
});

// =====================================
// ADD BOOK
// =====================================
app.post('/api/books', async (req, res) => {
  try {
    console.log('Received book:', req.body);

    const { title, author, isbn, quantity } = req.body;

    // Accept either genre or category from the frontend
    const category = req.body.category ?? req.body.genre;

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof author !== 'string' ||
      !author.trim() ||
      typeof category !== 'string' ||
      !category.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, and genre/category are required.',
      });
    }

    if (
      isbn != null &&
      String(isbn).trim() !== '' &&
      !/^[0-9]+$/.test(String(isbn))
    ) {
      return res.status(400).json({
        success: false,
        message: 'ISBN must contain numbers only.',
      });
    }

    const qty = Number(quantity);

    if (!Number.isSafeInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive whole number.',
      });
    }

    const cleanIsbn =
      isbn == null || String(isbn).trim() === ''
        ? null
        : String(isbn).trim();

    // New books start with all copies available
    const [result] = await db.query(
      `INSERT INTO books
        (title, author, isbn, category, quantity, available)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        author.trim(),
        cleanIsbn,
        category.trim(),
        qty,
        qty,
      ]
    );

    const [rows] = await db.query(
      `SELECT
        book_id,
        title,
        author,
        isbn,
        category,
        quantity,
        available,
        category AS genre
       FROM books
       WHERE book_id = ?`,
      [result.insertId]
    );

    console.log('Book saved successfully:', rows[0]);

    return res.status(201).json({
      success: true,
      message: 'Book saved to MySQL successfully.',
      book: rows[0],
    });
  } catch (err) {
    console.error('Failed to add book:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This ISBN already exists.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to add book.',
      error: err.sqlMessage || err.message,
      code: err.code || null,
    });
  }
});

// =====================================
// UPDATE BOOK BY ISBN
// =====================================
app.put('/api/books/:isbn', async (req, res) => {
  try {
    const currentIsbn = req.params.isbn;
    const { title, author, isbn, quantity } = req.body;
    const category = req.body.category ?? req.body.genre;

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof author !== 'string' ||
      !author.trim() ||
      typeof category !== 'string' ||
      !category.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, and genre/category are required.',
      });
    }

    if (
      isbn == null ||
      !/^[0-9]+$/.test(String(isbn))
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid numeric ISBN is required.',
      });
    }

    const qty = Number(quantity);

    if (!Number.isSafeInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive whole number.',
      });
    }

    const [existingRows] = await db.query(
      'SELECT book_id, quantity, available FROM books WHERE isbn = ?',
      [currentIsbn]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Book not found.',
      });
    }

    const existing = existingRows[0];

    // Preserve the number of borrowed copies when changing quantity.
    const borrowed = Number(existing.quantity) - Number(existing.available);

    if (qty < borrowed) {
      return res.status(400).json({
        success: false,
        message: `Quantity cannot be less than the ${borrowed} copies currently borrowed.`,
      });
    }

    const newAvailable = qty - borrowed;

    const [result] = await db.query(
      `UPDATE books
       SET title = ?,
           author = ?,
           isbn = ?,
           category = ?,
           quantity = ?,
           available = ?
       WHERE isbn = ?`,
      [
        title.trim(),
        author.trim(),
        String(isbn),
        category.trim(),
        qty,
        newAvailable,
        currentIsbn,
      ]
    );

    return res.json({
      success: true,
      message: 'Book updated successfully.',
      changed: result.affectedRows > 0,
    });
  } catch (err) {
    console.error('Failed to update book:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Another book already uses this ISBN.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update book.',
      error: err.sqlMessage || err.message,
      code: err.code || null,
    });
  }
});

// =====================================
// DELETE BOOK BY ISBN
// =====================================
app.delete('/api/books/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params;

    const [result] = await db.query(
      'DELETE FROM books WHERE isbn = ?',
      [isbn]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Book not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Book deleted successfully.',
    });
  } catch (err) {
    console.error('Failed to delete book:', err);

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'This book is referenced by another record and cannot be deleted.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete book.',
      error: err.sqlMessage || err.message,
      code: err.code || null,
    });
  }
});

// =====================================
// HANDLE INVALID JSON
// =====================================
app.use((err, req, res, next) => {
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    'body' in err
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request body.',
    });
  }

  next(err);
});

/* =====================================
   GET ALL USERS
===================================== */
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT user_id, full_name, email, role, created_at
      FROM users
      ORDER BY user_id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch users:', err);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
      error: err.sqlMessage || err.message,
    });
  }
});

/* =====================================
   ADD USER - PLAIN TEXT PASSWORD
===================================== */
app.post('/api/users', async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;
    const userRole = role || 'student';
    const allowedRoles = ['admin', 'librarian', 'student'];

    if (
      typeof full_name !== 'string' ||
      !full_name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password ||
      !allowedRoles.includes(userRole)
    ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required and the role must be valid.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password, role)
       VALUES (?, ?, ?, ?)`,
      [
        full_name.trim(),
        normalizedEmail,
        password,
        userRole,
      ]
    );

    const [rows] = await db.query(
      `SELECT user_id, full_name, email, role, created_at
       FROM users WHERE user_id = ?`,
      [result.insertId]
    );

    console.log('User saved:', rows[0].email);

    return res.status(201).json({
      success: true,
      message: 'User saved to MySQL successfully.',
      user: rows[0],
    });
  } catch (err) {
    console.error('Failed to add user:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to save user.',
      error: err.sqlMessage || err.message,
    });
  }
});

/* =====================================
   UPDATE USER
===================================== */
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { full_name, email, role } = req.body;
    const allowedRoles = ['admin', 'librarian', 'student'];

    if (
      !Number.isSafeInteger(userId) ||
      userId < 1 ||
      typeof full_name !== 'string' ||
      !full_name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      !allowedRoles.includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid user ID, name, email, and role.',
      });
    }

    const [result] = await db.query(
      `UPDATE users
       SET full_name = ?, email = ?, role = ?
       WHERE user_id = ?`,
      [
        full_name.trim(),
        email.trim().toLowerCase(),
        role,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        'SELECT user_id FROM users WHERE user_id = ?',
        [userId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }
    }

    return res.json({
      success: true,
      message: 'User updated successfully.',
    });
  } catch (err) {
    console.error('Failed to update user:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update user.',
      error: err.sqlMessage || err.message,
    });
  }
});

/* =====================================
   DELETE USER
===================================== */
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    const [result] = await db.query(
      'DELETE FROM users WHERE user_id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (err) {
    console.error('Failed to delete user:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
      error: err.sqlMessage || err.message,
    });
  }
});

// =====================================
// START SERVER
// =====================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
