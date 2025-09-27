const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class License {
  static generateLicenseKey(type) {
    const prefix = {
      'free': 'FREE',
      'basic': 'BASIC',
      'standard': 'STANDARD',
      'premium': 'PREMIUM'
    };
    
    const randomPart = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
    return `${prefix[type]}-MVB-${randomPart}`;
  }

  static async create(licenseData) {
    const { user_id, license_type, duration_days, max_devices = 1 } = licenseData;
    const license_key = this.generateLicenseKey(license_type);
    const expires_at = moment().add(duration_days, 'days').format('YYYY-MM-DD HH:mm:ss');
    
    const [result] = await pool.execute(
      'INSERT INTO licenses (user_id, license_key, license_type, expires_at, max_devices) VALUES (?, ?, ?, ?, ?)',
      [user_id, license_key, license_type, expires_at, max_devices]
    );
    
    return { id: result.insertId, license_key, expires_at };
  }

  static async findByKey(license_key) {
    const [rows] = await pool.execute(`
      SELECT l.*, u.email, u.name, u.status as user_status
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.license_key = ? AND l.is_active = true
    `, [license_key]);
    
    return rows[0];
  }

  static async validateLicense(license_key, device_fingerprint) {
    const license = await this.findByKey(license_key);
    
    if (!license) {
      return { valid: false, error: 'Licença não encontrada' };
    }

    if (license.user_status !== 'active') {
      return { valid: false, error: 'Usuário suspenso ou inativo' };
    }

    if (moment(license.expires_at).isBefore(moment())) {
      return { valid: false, error: 'Licença expirada' };
    }

    // Verificar dispositivos ativos
    const [deviceRows] = await pool.execute(
      'SELECT COUNT(*) as device_count FROM device_sessions WHERE license_id = ? AND is_active = true',
      [license.id]
    );

    const activeDevices = deviceRows[0].device_count;

    // Verificar se o dispositivo já está registrado
    const [existingDevice] = await pool.execute(
      'SELECT * FROM device_sessions WHERE license_id = ? AND device_fingerprint = ?',
      [license.id, device_fingerprint]
    );

    if (existingDevice.length === 0) {
      // Novo dispositivo
      if (activeDevices >= license.max_devices) {
        return { valid: false, error: 'Limite de dispositivos atingido' };
      }
      
      // Registrar novo dispositivo
      await pool.execute(
        'INSERT INTO device_sessions (license_id, device_fingerprint) VALUES (?, ?)',
        [license.id, device_fingerprint]
      );
    } else {
      // Atualizar atividade do dispositivo existente
      await pool.execute(
        'UPDATE device_sessions SET last_activity = CURRENT_TIMESTAMP WHERE license_id = ? AND device_fingerprint = ?',
        [license.id, device_fingerprint]
      );
    }

    return { 
      valid: true, 
      license: {
        ...license,
        days_remaining: moment(license.expires_at).diff(moment(), 'days')
      }
    };
  }

  static async getUserLicenses(user_id) {
    const [rows] = await pool.execute(`
      SELECT l.*, 
             COUNT(ds.id) as active_devices,
             DATEDIFF(l.expires_at, NOW()) as days_remaining
      FROM licenses l
      LEFT JOIN device_sessions ds ON l.id = ds.license_id AND ds.is_active = true
      WHERE l.user_id = ? AND l.is_active = true
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `, [user_id]);
    
    return rows;
  }

  static async getAll() {
    const [rows] = await pool.execute(`
      SELECT l.*, u.email, u.name,
             COUNT(ds.id) as active_devices,
             DATEDIFF(l.expires_at, NOW()) as days_remaining
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN device_sessions ds ON l.id = ds.license_id AND ds.is_active = true
      WHERE l.is_active = true
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);
    
    return rows;
  }

  static async deactivate(id) {
    await pool.execute(
      'UPDATE licenses SET is_active = false WHERE id = ?',
      [id]
    );
    
    // Desativar todas as sessões de dispositivos
    await pool.execute(
      'UPDATE device_sessions SET is_active = false WHERE license_id = ?',
      [id]
    );
  }

  static async extend(id, additional_days) {
    await pool.execute(
      'UPDATE licenses SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY) WHERE id = ?',
      [additional_days, id]
    );
  }
}

module.exports = License;