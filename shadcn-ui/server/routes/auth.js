const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const License = require('../models/License');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Registro de usuário
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar se o usuário já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criar usuário
    const userId = await User.create({ email, password, name });

    // Criar licença gratuita de 7 dias
    const license = await License.create({
      user_id: userId,
      license_type: 'free',
      duration_days: 7,
      max_devices: 1
    });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: { id: userId, email, name },
      license: license.license_key
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Conta suspensa ou inativa' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Validar licença
router.post('/validate-license', async (req, res) => {
  try {
    const { license_key, device_fingerprint } = req.body;

    if (!license_key || !device_fingerprint) {
      return res.status(400).json({ error: 'Licença e identificação do dispositivo são obrigatórias' });
    }

    const validation = await License.validateLicense(license_key, device_fingerprint);

    if (!validation.valid) {
      return res.status(403).json({ error: validation.error });
    }

    res.json({
      valid: true,
      license: validation.license,
      message: 'Licença válida'
    });
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter perfil do usuário
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const licenses = await License.getUserLicenses(req.user.id);
    
    res.json({
      user: req.user,
      licenses
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;