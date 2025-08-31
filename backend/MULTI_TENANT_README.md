# Multi-Tenant CBT System - Managed Admin Platform

## 🚀 Overview

This is a comprehensive multi-tenant Computer-Based Testing (CBT) system with a managed admin platform that allows centralized management of multiple school institutions. The system provides secure tenant isolation, role-based access control, and comprehensive audit trails.

## 🏗️ Architecture

### Multi-Tenant Data Model
- **Tenants**: School institutions with isolated data
- **Users**: Role-based users (super_admin, managed_admin, tenant_admin, teacher, student)
- **Audit Logs**: Comprehensive audit trail for all operations
- **RBAC**: Role-based access control with granular permissions

### Security Features
- **MFA**: Multi-factor authentication for managed admins
- **Audit Logs**: Immutable audit trail for all operations
- **Encryption**: Data encryption at rest and in transit
- **Rate Limiting**: API rate limiting for security
- **CORS**: Cross-origin resource sharing protection

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 5.0+
- npm or yarn
- Git

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd CBT/backend
npm install
```

### 2. Environment Configuration

Create `.env` file in the backend directory:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cbt_multi_tenant
DB_TYPE=mongodb

# Security
JWT_SECRET=your-super-secret-jwt-key-here
ALLOW_DB_CLEAR=false

# Server
PORT=5000
NODE_ENV=production

# Optional
COMMIT_HASH=git-commit-hash
```

### 3. Initialize the System

```bash
# Create backup of existing data (if any)
node create-db-backup.js

# Initialize super admin and managed admin users
node create-super-admin.js
```

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

## 🔐 Default Credentials

After initialization, you'll have these default accounts:

### Super Admin
- **Email**: superadmin@cbt-system.com
- **Password**: superadmin123
- **Role**: Full system access, database management

### Managed Admin
- **Email**: managedadmin@cbt-system.com
- **Password**: managedadmin123
- **Role**: Tenant management, user administration

⚠️ **IMPORTANT**: Change these passwords immediately in production!

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication

### Managed Admin API (v1)
- `GET /api/v1/managed-admin/tenants` - List all tenants
- `POST /api/v1/managed-admin/tenants` - Create new tenant
- `GET /api/v1/managed-admin/tenants/:id` - Get tenant details
- `POST /api/v1/managed-admin/tenants/:id/suspend` - Suspend tenant
- `POST /api/v1/managed-admin/tenants/:id/reinstate` - Reinstate tenant
- `POST /api/v1/managed-admin/tenants/:id/reset-default-admin` - Reset default admin password
- `DELETE /api/v1/managed-admin/tenants/:id` - Remove tenant
- `GET /api/v1/managed-admin/audit-logs` - View audit logs

### Database Management API (v1)
- `GET /api/v1/database/status` - Database status
- `POST /api/v1/database/backup` - Create backup
- `GET /api/v1/database/backups` - List backups
- `POST /api/v1/database/clear` - Clear database (super admin only)

### Legacy API (for backward compatibility)
- `GET /api/exams` - Get exams
- `GET /api/questions` - Get questions
- `GET /api/results` - Get results
- `GET /api/users` - Get users
- `POST /api/users` - Update users
- `POST /api/exams` - Update exams
- `POST /api/questions` - Update questions
- `POST /api/results` - Update results

## 🔧 Database Management

### Creating Backups

```bash
# Create comprehensive backup
node create-db-backup.js
```

### Clearing Database

```bash
# Soft clear (mark as deleted)
node clear-database.js soft snap-2025-08-31T07-12-43-139Z --confirm

# Hard clear (permanent deletion)
node clear-database.js hard snap-2025-08-31T07-12-43-139Z --confirm
```

⚠️ **WARNING**: Database clear operations are irreversible. Always create a backup first!

### Environment Variables for Database Operations

```env
# Enable database clear operations (default: false)
ALLOW_DB_CLEAR=true

# Database connection
MONGODB_URI=your-mongodb-connection-string
```

## 🏫 Tenant Management Workflow

### 1. Create a New School Tenant

```bash
curl -X POST https://your-api.com/api/v1/managed-admin/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "College of Nursing Sciences",
    "slug": "conursing",
    "address": "123 Nursing Street, Lagos",
    "contact_email": "admin@conursing.edu.ng",
    "contact_phone": "+2348012345678",
    "timezone": "Africa/Lagos",
    "language": "en",
    "plan": "premium",
    "default_admin": {
      "email": "admin@conursing.edu.ng",
      "fullName": "School Administrator",
      "phone": "+2348012345678"
    }
  }'
```

### 2. Reset Default Admin Password

```bash
curl -X POST https://your-api.com/api/v1/managed-admin/tenants/TENANT_ID/reset-default-admin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Suspend/Reinstate Tenant

```bash
# Suspend
curl -X POST https://your-api.com/api/v1/managed-admin/tenants/TENANT_ID/suspend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason": "Payment overdue"}'

# Reinstate
curl -X POST https://your-api.com/api/v1/managed-admin/tenants/TENANT_ID/reinstate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Audit Logs

All operations are logged with:
- Actor information (user, IP, user agent)
- Action performed
- Resource affected
- Timestamp
- Success/failure status
- Additional details

### Viewing Audit Logs

```bash
curl -X GET "https://your-api.com/api/v1/managed-admin/audit-logs?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔒 Security Best Practices

### 1. Password Security
- Change default passwords immediately
- Use strong, unique passwords
- Implement password rotation policies
- Enable MFA for admin accounts

### 2. API Security
- Use HTTPS in production
- Implement proper CORS policies
- Rate limit API endpoints
- Validate all input data

### 3. Database Security
- Use connection string authentication
- Enable MongoDB access control
- Regular security updates
- Encrypt sensitive data

### 4. Environment Security
- Never commit `.env` files
- Use environment-specific configurations
- Regular security audits
- Monitor access logs

## 🚀 Deployment

### Render Deployment

1. **Connect Repository**
   - Connect your Git repository to Render
   - Set build command: `npm install`
   - Set start command: `npm start`

2. **Environment Variables**
   ```
   MONGODB_URI=your-mongodb-atlas-connection-string
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=production
   ALLOW_DB_CLEAR=false
   ```

3. **Deploy**
   - Render will automatically deploy on push
   - Monitor deployment logs
   - Verify health check endpoint

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

## 🧪 Testing

### API Testing

```bash
# Health check
curl https://your-api.com/health

# API info
curl https://your-api.com/api

# Authentication
curl -X POST https://your-api.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "superadmin123"}'
```

### Database Testing

```bash
# Test database connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(console.error)"

# Test backup creation
node create-db-backup.js
```

## 📝 API Documentation

### Authentication Response

```json
{
  "id": "user_id",
  "username": "superadmin",
  "email": "superadmin@cbt-system.com",
  "role": "super_admin",
  "fullName": "System Super Administrator",
  "tenant_id": "tenant_id",
  "is_default_admin": true,
  "is_active": true
}
```

### Tenant Creation Response

```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "id": "tenant_id",
    "name": "College of Nursing Sciences",
    "slug": "conursing",
    "contact_email": "admin@conursing.edu.ng",
    "plan": "premium",
    "created_at": "2025-08-31T07:12:43.139Z"
  },
  "default_admin": {
    "id": "user_id",
    "email": "admin@conursing.edu.ng",
    "username": "admin",
    "temp_password": "a1b2c3d4"
  }
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MONGODB_URI in .env
   - Verify network connectivity
   - Check MongoDB Atlas IP whitelist

2. **Authentication Failed**
   - Verify username/password
   - Check user is_active status
   - Ensure tenant is not suspended

3. **Permission Denied**
   - Verify user role permissions
   - Check tenant status
   - Ensure proper authentication

4. **API Rate Limited**
   - Reduce request frequency
   - Implement proper caching
   - Contact admin for limit increase

### Logs and Debugging

```bash
# View application logs
npm run dev

# Check database connection
node -e "console.log(process.env.MONGODB_URI)"

# Test backup functionality
node create-db-backup.js
```

## 📞 Support

For technical support:
- Check the audit logs for error details
- Review the troubleshooting section
- Contact system administrator
- Check MongoDB Atlas dashboard for database issues

## 🔄 Version History

- **v2.0.0**: Multi-tenant architecture with managed admin platform
- **v1.0.0**: Single-tenant CBT system

## 📄 License

This project is proprietary software. All rights reserved.

---

**⚠️ Important Notes:**
- Always backup before destructive operations
- Change default passwords in production
- Monitor audit logs regularly
- Keep dependencies updated
- Test thoroughly before production deployment
