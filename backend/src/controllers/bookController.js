const db = require('../config/database');

function validateBook(body) {
  const { title, author, quantity } = body;
  if (!title || !author || quantity === undefined) {
    return 'title, author, and quantity are required';
  }
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
    return 'quantity must be a positive integer';
  }
  return null;
}

async function listBooks(req, res, next) {
  try {
    const { q, category } = req.query;
    let sql = `SELECT book_id, isbn, title, author, publisher, category,
      publication_year, quantity, available_quantity, created_at, updated_at
      FROM books WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ? OR book_id = ?)';
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern, Number.isNaN(Number(q)) ? 0 : Number(q));
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY title ASC';

    const [rows] = await db.execute(sql, params);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getBook(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM books WHERE book_id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Book not found' });
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function createBook(req, res, next) {
  try {
    const errorMessage = validateBook(req.body);
    if (errorMessage) return res.status(400).json({ message: errorMessage });

    const {
      isbn, title, author, publisher, category, publication_year, quantity
    } = req.body;
    const numericQuantity = Number(quantity);

    const [result] = await db.execute(
      `INSERT INTO books
       (isbn, title, author, publisher, category, publication_year, quantity, available_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [isbn || null, title.trim(), author.trim(), publisher || null, category || null,
       publication_year || null, numericQuantity, numericQuantity]
    );

    const [rows] = await db.execute('SELECT * FROM books WHERE book_id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'ISBN already exists' });
    }
    return next(error);
  }
}

async function updateBook(req, res, next) {
  try {
    const [currentRows] = await db.execute('SELECT * FROM books WHERE book_id = ?', [req.params.id]);
    const current = currentRows[0];
    if (!current) return res.status(404).json({ message: 'Book not found' });

    const quantity = req.body.quantity === undefined ? current.quantity : Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'quantity must be a positive integer' });
    }

    const borrowed = current.quantity - current.available_quantity;
    if (quantity < borrowed) {
      return res.status(400).json({ message: `quantity cannot be less than currently issued copies (${borrowed})` });
    }

    const available = quantity - borrowed;
    const {
      isbn = current.isbn, title = current.title, author = current.author,
      publisher = current.publisher, category = current.category,
      publication_year = current.publication_year
    } = req.body;

    await db.execute(
      `UPDATE books SET isbn=?, title=?, author=?, publisher=?, category=?,
       publication_year=?, quantity=?, available_quantity=? WHERE book_id=?`,
      [isbn || null, title.trim(), author.trim(), publisher || null, category || null,
       publication_year || null, quantity, available, req.params.id]
    );

    const [rows] = await db.execute('SELECT * FROM books WHERE book_id = ?', [req.params.id]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'ISBN already exists' });
    }
    return next(error);
  }
}

async function deleteBook(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM books WHERE book_id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Book not found' });

    const [loans] = await db.execute(
      'SELECT loan_id FROM loans WHERE book_id = ? LIMIT 1',
      [req.params.id]
    );

    if (loans.length) {
      return res.status(409).json({
        message: 'Book cannot be deleted because transaction history exists'
      });
    }

    await db.execute('DELETE FROM books WHERE book_id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listBooks, getBook, createBook, updateBook, deleteBook };
