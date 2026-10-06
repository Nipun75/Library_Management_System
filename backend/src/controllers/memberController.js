const db = require('../config/database');

async function listMembers(req, res, next) {
  try {
    const { q, status } = req.query;
    let sql = `SELECT member_id, user_id, membership_no, full_name, email, phone,
      address, joined_at, status, created_at, updated_at
      FROM members WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (membership_no LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY full_name ASC';

    const [rows] = await db.execute(sql, params);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getMember(req, res, next) {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM members WHERE member_id = ?',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Member not found' });
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function createMember(req, res, next) {
  try {
    const { membership_no, full_name, email, phone, address, joined_at, user_id } = req.body;

    if (!membership_no || !full_name) {
      return res.status(400).json({
        message: 'membership_no and full_name are required'
      });
    }

    const [result] = await db.execute(
      `INSERT INTO members
       (user_id, membership_no, full_name, email, phone, address, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        membership_no.trim(),
        full_name.trim(),
        email || null,
        phone || null,
        address || null,
        joined_at || new Date().toISOString().slice(0, 10)
      ]
    );

    const [rows] = await db.execute(
      'SELECT * FROM members WHERE member_id = ?',
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Membership number or linked user already exists' });
    }
    return next(error);
  }
}

async function updateMember(req, res, next) {
  try {
    const [currentRows] = await db.execute(
      'SELECT * FROM members WHERE member_id = ?',
      [req.params.id]
    );
    const current = currentRows[0];

    if (!current) return res.status(404).json({ message: 'Member not found' });

    const {
      membership_no = current.membership_no,
      full_name = current.full_name,
      email = current.email,
      phone = current.phone,
      address = current.address,
      status = current.status,
      user_id = current.user_id
    } = req.body;

    if (!membership_no || !full_name) {
      return res.status(400).json({
        message: 'membership_no and full_name are required'
      });
    }

    await db.execute(
      `UPDATE members
       SET user_id=?, membership_no=?, full_name=?, email=?, phone=?, address=?, status=?
       WHERE member_id=?`,
      [
        user_id || null,
        membership_no.trim(),
        full_name.trim(),
        email || null,
        phone || null,
        address || null,
        status,
        req.params.id
      ]
    );

    const [rows] = await db.execute(
      'SELECT * FROM members WHERE member_id = ?',
      [req.params.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Membership number or linked user already exists' });
    }
    return next(error);
  }
}

async function deactivateMember(req, res, next) {
  try {
    const [result] = await db.execute(
      "UPDATE members SET status='INACTIVE' WHERE member_id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Member not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listMembers,
  getMember,
  createMember,
  updateMember,
  deactivateMember
};
