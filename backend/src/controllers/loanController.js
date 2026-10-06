const db = require('../config/database');

const DEFAULT_LOAN_DAYS = 14;
const MAX_RENEWALS = 2;
const FINE_PER_DAY = 5.00;

async function issueBook(req, res, next) {
  const connection = await db.getConnection();

  try {
    const { book_id, member_id, due_date } = req.body;
    if (!book_id || !member_id) {
      return res.status(400).json({ message: 'book_id and member_id are required' });
    }

    await connection.beginTransaction();

    const [members] = await connection.execute(
      "SELECT member_id FROM members WHERE member_id = ? AND status = 'ACTIVE' FOR UPDATE",
      [member_id]
    );
    if (!members[0]) {
      await connection.rollback();
      return res.status(400).json({ message: 'Member is not active or does not exist' });
    }

    const [books] = await connection.execute(
      'SELECT book_id, available_quantity FROM books WHERE book_id = ? FOR UPDATE',
      [book_id]
    );
    const book = books[0];
    if (!book) {
      await connection.rollback();
      return res.status(404).json({ message: 'Book not found' });
    }
    if (book.available_quantity < 1) {
      await connection.rollback();
      return res.status(409).json({ message: 'Book is not available' });
    }

    const [existing] = await connection.execute(
      "SELECT loan_id FROM loans WHERE book_id = ? AND member_id = ? AND status IN ('ISSUED', 'OVERDUE') LIMIT 1",
      [book_id, member_id]
    );
    if (existing[0]) {
      await connection.rollback();
      return res.status(409).json({ message: 'Member already has this book issued' });
    }

    if (due_date) {
      await connection.execute(
        `INSERT INTO loans (book_id, member_id, issued_by, issue_date, due_date)
         VALUES (?, ?, ?, CURDATE(), ?)`,
        [book_id, member_id, req.user.userId, due_date]
      );
    } else {
      await connection.execute(
        `INSERT INTO loans (book_id, member_id, issued_by, issue_date, due_date)
         VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY))`,
        [book_id, member_id, req.user.userId, DEFAULT_LOAN_DAYS]
      );
    }

    await connection.execute(
      'UPDATE books SET available_quantity = available_quantity - 1 WHERE book_id = ?',
      [book_id]
    );

    await connection.commit();

    const [rows] = await db.execute(
      `SELECT l.*, b.title, m.membership_no, m.full_name
       FROM loans l
       JOIN books b ON b.book_id = l.book_id
       JOIN members m ON m.member_id = l.member_id
       WHERE l.book_id = ? AND l.member_id = ?
       ORDER BY l.loan_id DESC LIMIT 1`,
      [book_id, member_id]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
}

async function listLoans(req, res, next) {
  try {
    const { member_id, status, overdue } = req.query;
    let sql = `SELECT l.*, b.title, b.isbn, m.membership_no, m.full_name,
      f.amount AS fine_amount, f.status AS fine_status
      FROM loans l
      JOIN books b ON b.book_id = l.book_id
      JOIN members m ON m.member_id = l.member_id
      LEFT JOIN fines f ON f.loan_id = l.loan_id
      WHERE 1=1`;
    const params = [];

    if (member_id) {
      sql += ' AND l.member_id = ?';
      params.push(member_id);
    }
    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }
    if (overdue === 'true') {
      sql += " AND l.status IN ('ISSUED', 'OVERDUE') AND l.due_date < CURDATE()";
    }

    sql += ' ORDER BY l.due_date ASC, l.loan_id DESC';
    const [rows] = await db.execute(sql, params);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function returnBook(req, res, next) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [loans] = await connection.execute(
      "SELECT * FROM loans WHERE loan_id = ? AND status IN ('ISSUED', 'OVERDUE') FOR UPDATE",
      [req.params.id]
    );
    const loan = loans[0];
    if (!loan) {
      await connection.rollback();
      return res.status(404).json({ message: 'Active loan not found' });
    }

    const [books] = await connection.execute(
      'SELECT book_id FROM books WHERE book_id = ? FOR UPDATE',
      [loan.book_id]
    );
    if (!books[0]) {
      await connection.rollback();
      return res.status(409).json({ message: 'Associated book no longer exists' });
    }

    const [dateRows] = await connection.execute(
      'SELECT GREATEST(DATEDIFF(CURDATE(), due_date), 0) AS late_days FROM loans WHERE loan_id = ?',
      [req.params.id]
    );
    const lateDays = Number(dateRows[0].late_days);
    const fineAmount = lateDays * FINE_PER_DAY;

    await connection.execute(
      "UPDATE loans SET return_date = CURDATE(), status = 'RETURNED' WHERE loan_id = ?",
      [req.params.id]
    );

    await connection.execute(
      'UPDATE books SET available_quantity = LEAST(quantity, available_quantity + 1) WHERE book_id = ?',
      [loan.book_id]
    );

    if (fineAmount > 0) {
      await connection.execute(
        `INSERT INTO fines (loan_id, amount, reason)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), reason = VALUES(reason)`,
        [req.params.id, fineAmount, `Overdue by ${lateDays} day(s)`]
      );
    }

    await connection.commit();
    return res.json({ message: 'Book returned successfully', loanId: loan.loan_id, lateDays, fineAmount });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
}

async function renewBook(req, res, next) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [loans] = await connection.execute(
      "SELECT * FROM loans WHERE loan_id = ? AND status = 'ISSUED' FOR UPDATE",
      [req.params.id]
    );
    const loan = loans[0];
    if (!loan) {
      await connection.rollback();
      return res.status(404).json({ message: 'Active loan not found' });
    }
    if (loan.renewal_count >= MAX_RENEWALS) {
      await connection.rollback();
      return res.status(409).json({ message: 'Maximum renewals reached' });
    }

    const [conflicts] = await connection.execute(
      "SELECT loan_id FROM loans WHERE book_id = ? AND status IN ('ISSUED', 'OVERDUE') AND loan_id <> ? LIMIT 1",
      [loan.book_id, loan.loan_id]
    );
    if (conflicts[0]) {
      await connection.rollback();
      return res.status(409).json({ message: 'Book has another active reservation/loan and cannot be renewed' });
    }

    await connection.execute(
      `UPDATE loans
       SET due_date = DATE_ADD(GREATEST(due_date, CURDATE()), INTERVAL ? DAY),
           renewal_count = renewal_count + 1
       WHERE loan_id = ?`,
      [DEFAULT_LOAN_DAYS, loan.loan_id]
    );

    await connection.commit();

    const [rows] = await db.execute('SELECT * FROM loans WHERE loan_id = ?', [loan.loan_id]);
    return res.json(rows[0]);
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
}

async function payFine(req, res, next) {
  try {
    const [result] = await db.execute(
      "UPDATE fines SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE fine_id = ? AND status = 'UNPAID'",
      [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Unpaid fine not found' });
    }
    const [rows] = await db.execute('SELECT * FROM fines WHERE fine_id = ?', [req.params.id]);
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function listFines(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT f.*, l.member_id, l.book_id, l.due_date, l.return_date,
        m.membership_no, m.full_name, b.title
       FROM fines f
       JOIN loans l ON l.loan_id = f.loan_id
       JOIN members m ON m.member_id = l.member_id
       JOIN books b ON b.book_id = l.book_id
       ORDER BY f.assessed_at DESC`
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = { issueBook, listLoans, returnBook, renewBook, payFine, listFines };
