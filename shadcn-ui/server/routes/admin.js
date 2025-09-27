const express = require('express');
const User = require('../models/User');
const License = require('../models/License');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação e admin para todas as rotas
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard administrativo
router.get('/dashboard', async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT COUNT(*) as total FROM users');
    const [licenses] = await pool.execute('SELECT COUNT(*) as total FROM licenses WHERE is_active = true');
    const [activeLicenses] = await pool.execute('SELECT COUNT(*) as total FROM licenses WHERE is_active = true AND expires_at > NOW()');
    const [expiredLicenses] = await pool.execute('SELECT COUNT(*) as total FROM licenses WHERE is_active = true AND expires_at <= NOW()');

    res.json({
      stats: {
        totalUsers: users[0].total,
        totalLicenses: licenses[0].total,
        activeLicenses: activeLicenses[0].total,
        expiredLicenses: expiredLicenses[0].total
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os usuários
router.get('/users', async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status do usuário
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    await User.updateStatus(id, status);
    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todas as licenças
router.get('/licenses', async (req, res) => {
  try {
    const licenses = await License.getAll();
    res.json(licenses);
  } catch (error) {
    console.error('Licenses list error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova licença
router.post('/licenses', async (req, res) => {
  try {
    const { user_id, license_type, duration_days, max_devices = 1 } = req.body;

    if (!user_id || !license_type || !duration_days) {
      return res.status(400).json({ error: 'Dados obrigatórios: user_id, license_type, duration_days' });
    }

    const license = await License.create({
      user_id,
      license_type,
      duration_days,
      max_devices
    });

    res.status(201).json({
      message: 'Licença criada com sucesso',
      license
    });
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Desativar licença
router.delete('/licenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await License.deactivate(id);
    res.json({ message: 'Licença desativada com sucesso' });
  } catch (error) {
    console.error('Deactivate license error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estender licença
router.put('/licenses/:id/extend', async (req, res) => {
  try {
    const { id } = req.params;
    const { additional_days } = req.body;

    if (!additional_days || additional_days <= 0) {
      return res.status(400).json({ error: 'Número de dias deve ser maior que zero' });
    }

    await License.extend(id, additional_days);
    res.json({ message: `Licença estendida por ${additional_days} dias` });
  } catch (error) {
    console.error('Extend license error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;