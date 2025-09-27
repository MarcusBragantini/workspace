const { initializeDatabase } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

async function setupDatabase() {
  try {
    console.log('🚀 Iniciando configuração do banco de dados...');
    
    // Inicializar banco
    await initializeDatabase();
    
    // Criar usuário admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@botmvb.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await User.findByEmail(adminEmail);
    if (!existingAdmin) {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        name: 'Administrador do Sistema',
        role: 'admin'
      });
      console.log(`✅ Usuário admin criado: ${adminEmail}`);
    } else {
      console.log('ℹ️ Usuário admin já existe');
    }
    
    console.log('✅ Configuração do banco de dados concluída!');
    console.log('\n📋 Credenciais do administrador:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Senha: ${adminPassword}`);
    console.log('\n🔗 Para acessar o sistema:');
    console.log('1. Inicie o servidor: npm run dev');
    console.log('2. Acesse: http://localhost:5173');
    console.log('3. Faça login com as credenciais acima');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na configuração:', error);
    process.exit(1);
  }
}

setupDatabase();