# Bot MVB Pro - Sistema SaaS de Trading

Sistema profissional de trading automatizado com controle completo de usuários, licenças e gerenciamento SaaS.

## 🚀 Funcionalidades

### Sistema de Usuários
- ✅ Autenticação JWT segura
- ✅ Registro de novos usuários
- ✅ Controle de status (ativo, suspenso, expirado)
- ✅ Painel administrativo completo

### Gerenciamento de Licenças
- ✅ Gerador automático de licenças
- ✅ Validação por dispositivo (fingerprinting)
- ✅ Controle de vencimento automático
- ✅ Bloqueio de serviço por expiração
- ✅ Tipos: Free, Basic, Standard, Premium
- ✅ Limite de dispositivos por licença

### Bot de Trading
- ✅ Interface profissional e moderna
- ✅ Estratégias avançadas (MHI, EMA, RSI)
- ✅ Integração com Deriv API
- ✅ Sistema de logs em tempo real
- ✅ Histórico de operações
- ✅ Controles de risco (Stop Win/Loss)

### Painel Administrativo
- ✅ Dashboard com estatísticas
- ✅ Gerenciamento de usuários
- ✅ Criação e controle de licenças
- ✅ Extensão de licenças
- ✅ Monitoramento de dispositivos ativos

## 🛠️ Tecnologias

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MySQL** - Banco de dados
- **JWT** - Autenticação
- **bcryptjs** - Criptografia de senhas

### Frontend
- **React 18** - Interface de usuário
- **TypeScript** - Tipagem estática
- **Shadcn/ui** - Componentes UI
- **Tailwind CSS** - Estilização
- **React Router** - Roteamento

## 📦 Instalação

### 1. Configurar Banco de Dados MySQL

```sql
CREATE DATABASE bot_mvb_saas;
CREATE USER 'mvb_user'@'localhost' IDENTIFIED BY 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON bot_mvb_saas.* TO 'mvb_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configurar Backend

```bash
cd server
npm install
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DB_HOST=localhost
DB_USER=mvb_user
DB_PASSWORD=sua_senha_aqui
DB_NAME=bot_mvb_saas
JWT_SECRET=sua_chave_jwt_super_secreta_aqui
ADMIN_EMAIL=admin@botmvb.com
ADMIN_PASSWORD=admin123
```

### 3. Inicializar Banco de Dados

```bash
npm run setup-db
```

### 4. Configurar Frontend

```bash
# Na raiz do projeto
npm install
cp .env.example .env
```

Edite o arquivo `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

## 🚀 Executar o Sistema

### 1. Iniciar Backend
```bash
cd server
npm run dev
```

### 2. Iniciar Frontend
```bash
# Na raiz do projeto
npm run dev
```

### 3. Acessar o Sistema
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Admin**: Use as credenciais definidas no .env

## 🔐 Credenciais Padrão

**Administrador:**
- Email: admin@botmvb.com
- Senha: admin123

## 📋 Como Usar

### Para Usuários Finais:
1. **Registro**: Crie uma conta (recebe 7 dias grátis)
2. **Login**: Acesse com suas credenciais
3. **Validar Licença**: Digite sua chave de licença
4. **Configurar Bot**: Insira token da Deriv e configure parâmetros
5. **Iniciar Trading**: Ative o bot e monitore os resultados

### Para Administradores:
1. **Login**: Use credenciais de admin
2. **Acessar /admin**: Painel administrativo completo
3. **Gerenciar Usuários**: Criar, suspender, ativar usuários
4. **Criar Licenças**: Gerar novas licenças para usuários
5. **Monitorar Sistema**: Acompanhar estatísticas e atividades

## 🔒 Segurança

- **JWT Authentication** - Tokens seguros com expiração
- **Password Hashing** - Senhas criptografadas com bcrypt
- **Rate Limiting** - Proteção contra ataques de força bruta
- **Device Fingerprinting** - Controle de dispositivos únicos
- **SQL Injection Protection** - Queries parametrizadas
- **CORS Configuration** - Controle de origem das requisições

## 📊 Tipos de Licença

| Tipo | Duração | Dispositivos | Recursos |
|------|---------|--------------|----------|
| **Free** | 7 dias | 1 | Recursos básicos |
| **Basic** | 30 dias | 1 | Recursos completos |
| **Standard** | 90 dias | 2 | Recursos + Suporte |
| **Premium** | 365 dias | 5 | Todos os recursos |

## 🛡️ Sistema de Proteção

- **Validação de Licença**: Verificação em tempo real
- **Bloqueio Automático**: Sistema para quando a licença expira
- **Controle de Dispositivos**: Limite de dispositivos simultâneos
- **Monitoramento**: Logs de atividade e auditoria
- **Backup de Segurança**: Proteção de dados críticos

## 🔧 Manutenção

### Comandos Úteis:

```bash
# Verificar status do sistema
curl http://localhost:3001/api/health

# Backup do banco de dados
mysqldump -u mvb_user -p bot_mvb_saas > backup.sql

# Restaurar backup
mysql -u mvb_user -p bot_mvb_saas < backup.sql

# Logs do servidor
tail -f server/logs/app.log
```

### Monitoramento:
- Verificar logs de erro regularmente
- Monitorar uso de CPU e memória
- Acompanhar estatísticas de usuários ativos
- Verificar licenças próximas do vencimento

## 📞 Suporte

Para suporte técnico ou dúvidas:
- **Email**: suporte@botmvb.com
- **Documentação**: Consulte este README
- **Logs**: Verifique os logs do sistema para debugging

## 📄 Licença

Sistema proprietário - Bot MVB Pro © 2025
Todos os direitos reservados.

---

**⚠️ Importante**: Este sistema foi desenvolvido para fins educacionais e de demonstração. Use apenas em contas demo para testes. O trading automatizado envolve riscos financeiros.