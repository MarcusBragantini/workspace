const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

class User {
  static async create(userData) {
    const { email, password, name, role = 'user' } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, role]
    );
    
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, email, name, role, status, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async updateStatus(id, status) {
    await pool.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );
  }

  static async getAll() {
    const [rows] = await pool.execute(`
      SELECT u.*, 
             COUNT(l.id) as license_count,
             MAX(l.expires_at) as latest_license_expiry
      FROM users u 
      LEFT JOIN licenses l ON u.id = l.user_id AND l.is_active = true
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return rows;
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
  }
}

module.exports = User;