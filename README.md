# CBT Local Institution

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Community-blue.svg)](https://www.mongodb.com/)
[![Windows](https://img.shields.io/badge/Platform-Windows-blue.svg)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A single-institution Computer-Based Testing (CBT) application designed for local Windows server deployment. This package provides a complete CBT solution without multi-tenant complexity, perfect for individual schools or institutions that prefer on-premises hosting.

## 🚀 Features

- **Institution-Only Design**: No multi-tenant admin features - clean, focused solution
- **Windows-Optimized**: Designed specifically for Windows Server environments
- **One-Click Setup**: Automated PowerShell installer for quick deployment
- **Local Database**: Uses MongoDB Community Server for data storage
- **Admin & Student Portals**: Complete web interface for both administrators and students
- **Exam Management**: Create, manage, and conduct online examinations
- **Result Management**: Track and analyze student performance
- **Service Integration**: Runs as a Windows service with PM2
- **Essay Auto-Scoring**: Hybrid auto-scoring for essay questions with admin finalization

## 🛠️ Technology Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB Community Server
- **Authentication**: JWT-based with bcrypt password hashing
- **Process Management**: PM2 for Windows service
- **Frontend**: Static HTML/JS served from backend
- **Platform**: Windows Server 2019/2022

## 📋 Prerequisites

- Windows Server 2019/2022 or Windows 10/11
- Administrator privileges
- Internet access (for initial setup)
- MongoDB Community Server

## 🚀 Quick Start

### Option 1: One-Click Installer (Recommended)

1. **Download and extract** this repository to your server
2. **Open PowerShell as Administrator**
3. **Navigate to the scripts folder**:
   ```powershell
   cd C:\path\to\cbt-local-institution\scripts
   ```
4. **Run the installer**:
   ```powershell
   powershell -ExecutionPolicy Bypass -NoProfile -File .\install-windows.ps1
   ```

The installer will automatically:
- Install Node.js LTS (if missing)
- Install PM2 globally
- Verify MongoDB service
- Create environment configuration
- Install dependencies
- Start the application as a Windows service

### Option 2: Manual Installation

1. **Install Node.js LTS**
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

2. **Install MongoDB Community Server**
   - Download from: https://www.mongodb.com/try/download/community
   - Install with default settings

3. **Install PM2**
   ```powershell
   npm install -g pm2
   ```

4. **Configure Environment**
   ```powershell
   cd C:\path\to\cbt-local-institution\backend
   copy env.example .env
   notepad .env
   ```

5. **Install Dependencies**
   ```powershell
   npm ci
   ```

6. **Start the Application**
   ```powershell
   pm2 start src/server.js --name cbt-local
   pm2 save
   pm2 startup windows
   ```

## 🌐 Access Points

After installation, access your CBT system at:

- **Admin Portal**: `http://localhost:5000/admin`
- **Student Portal**: `http://localhost:5000/student`
- **Health Check**: `http://localhost:5000/health`
- **API Base**: `http://localhost:5000/api`

For network access, replace `localhost` with your server's IP address.

## 📁 Project Structure

```
cbt-local-institution/
├── backend/                    # Node.js backend application
│   ├── src/
│   │   ├── config/            # Database and JWT configuration
│   │   ├── middleware/        # Authentication and validation
│   │   ├── models/           # MongoDB data models
│   │   └── server.js         # Main application server
│   ├── public/               # Static web pages
│   │   ├── admin.html        # Admin dashboard
│   │   └── student-dashboard.html
│   ├── env.example           # Environment configuration template
│   └── package.json          # Backend dependencies
├── scripts/                  # Deployment scripts
│   ├── install-windows.ps1   # One-click installer
│   └── README.md            # Installation guide
└── README.md                # This file
```

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cbt_local
JWT_SECRET=your-secure-secret-key
```

### Default Admin Account

After first installation, create an admin account:

1. Access the admin portal
2. Use the registration form to create the first admin user
3. Set role to "admin" for full access

## 📊 Management

### PM2 Commands

```powershell
pm2 status                    # Check application status
pm2 logs cbt-local           # View application logs
pm2 restart cbt-local        # Restart the application
pm2 stop cbt-local           # Stop the application
pm2 delete cbt-local         # Remove from PM2
```

### Database Backup

```powershell
# Backup database
mongodump --db cbt_local --out C:\backups\cbt_$(Get-Date -Format yyyyMMdd)

# Restore database
mongorestore --db cbt_local C:\backups\cbt_20250101\cbt_local
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Role-Based Access**: Admin and Student roles
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Configurable cross-origin policies

## 🎯 Usage Guide

### For Administrators

1. **Access Admin Portal** at `/admin`
2. **Create User Accounts** for students and staff
3. **Create Exams** with questions and time limits
4. **Monitor Results** and student performance
5. **Manage System Settings** and configurations

### For Students

1. **Access Student Portal** at `/student`
2. **View Available Exams** assigned to you
3. **Take Exams** with built-in timer and navigation
4. **View Results** (if enabled by admin)

## 🔧 Troubleshooting

### Common Issues

**Application won't start:**
- Check MongoDB service is running
- Verify `.env` configuration
- Check PM2 logs: `pm2 logs cbt-local`

**Database connection errors:**
- Ensure MongoDB is installed and running
- Check `MONGODB_URI` in `.env`
- Verify MongoDB service status

**Port conflicts:**
- Change `PORT` in `.env` if 5000 is in use
- Update firewall rules for new port

### Logs and Monitoring

- **Application Logs**: `pm2 logs cbt-local`
- **MongoDB Logs**: Check Windows Event Viewer
- **Health Check**: Visit `/health` endpoint

## 🤝 Support

For support and questions:
- Check the troubleshooting section above
- Review the installation logs
- Create an issue on GitHub

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for educational institutions that prefer local hosting.**