const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function signup({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
  if (existing.rows.length) {
    const error = new Error('An account with this email already exists');
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     RETURNING id, name, email, role`,
    [name.trim(), normalizedEmail, passwordHash]
  );
  const user = result.rows[0];
  return { user: publicUser(user), token: signToken(user) };
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role
     FROM users
     WHERE LOWER(email) = $1 AND is_active = TRUE`,
    [normalizedEmail]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error('Invalid email or password');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  return { user: publicUser(user), token: signToken(user) };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function getUserById(id) {
  const result = await pool.query(
    `SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  return result.rows[0] ? publicUser(result.rows[0]) : null;
}

module.exports = { signup, login, verifyToken, getUserById };
