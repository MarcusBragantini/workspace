const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Conta suspensa ou inativa' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Privilégios de administrador requeridos.' });
  }
  next();
};

module.exports = { authenticateToken, requireAdmin };