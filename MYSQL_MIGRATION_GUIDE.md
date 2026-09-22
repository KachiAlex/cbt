# MySQL Migration Guide for CBT App

## 🎯 **Migration Overview**

This guide shows how to migrate your CBT app from **MongoDB** to **MySQL** using **Sequelize ORM**.

## 📋 **Prerequisites**

### 1. Install MySQL Server
```bash
# Windows (using Chocolatey)
choco install mysql

# Or download from: https://dev.mysql.com/downloads/mysql/
```

### 2. Create Database
```sql
CREATE DATABASE cbt_local;
CREATE USER 'cbt_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON cbt_local.* TO 'cbt_user'@'localhost';
FLUSH PRIVILEGES;
```

## 🔄 **Migration Steps**

### Step 1: Install Dependencies
```bash
cd cbt-local-institution/backend
npm install sequelize mysql2
npm uninstall mongoose
```

### Step 2: Update Environment Variables
```bash
# Copy the new environment file
cp env.example .env

# Edit .env file with your MySQL credentials
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cbt_local
DB_USER=cbt_user
DB_PASSWORD=your_password
```

### Step 3: Database Schema Creation
The Sequelize models will automatically create the following tables:

```sql
-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  full_name VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'managed_admin', 'tenant_admin', 'admin', 'teacher', 'student') DEFAULT 'student',
  is_default_admin BOOLEAN DEFAULT FALSE,
  must_change_password BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Exams table
CREATE TABLE exams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration INT,
  question_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  type ENUM('objective', 'subjective', 'mixed') DEFAULT 'objective',
  instructions TEXT,
  passing_score INT,
  max_attempts INT DEFAULT 1,
  start_date DATETIME,
  end_date DATETIME,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Questions table
CREATE TABLE questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'true_false', 'essay', 'fill_blank') NOT NULL,
  options JSON,
  correct_answer VARCHAR(500),
  points INT DEFAULT 1,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  explanation TEXT,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Results table
CREATE TABLE results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_id INT NOT NULL,
  user_id INT NOT NULL,
  score INT DEFAULT 0,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  wrong_answers INT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  status ENUM('completed', 'incomplete', 'abandoned') DEFAULT 'completed',
  time_spent INT,
  answers JSON,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  is_passed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🚀 **Running the Migration**

### Step 1: Start MySQL Server
```bash
# Windows
net start mysql

# Or start MySQL service from Services.msc
```

### Step 2: Run the Application
```bash
cd cbt-local-institution/backend
npm start
```

The application will:
1. Connect to MySQL database
2. Create tables automatically (if they don't exist)
3. Start the server on port 5100

### Step 3: Verify Migration
```bash
# Check health endpoint
curl http://localhost:5100/health

# Expected response:
{
  "status": "healthy",
  "database": {
    "connected": true,
    "state": "connected",
    "host": "localhost",
    "name": "cbt_local"
  }
}
```

## 🔧 **Key Changes Made**

### 1. Database Configuration
- **Before:** `mongoose.connect(MONGODB_URI)`
- **After:** `new Sequelize(database, username, password, options)`

### 2. Model Definitions
- **Before:** Mongoose schemas with `mongoose.Schema`
- **After:** Sequelize models with `DataTypes`

### 3. Query Methods
- **Before:** `User.findOne({ email })`
- **After:** `User.findOne({ where: { email } })`

### 4. Relationships
- **Before:** `populate()` for references
- **After:** `include` with `associations`

## 📊 **Benefits of MySQL Migration**

✅ **Relational Data Integrity** - Foreign keys and constraints  
✅ **ACID Compliance** - Better data consistency  
✅ **Familiar SQL Queries** - Easy to debug and optimize  
✅ **Better Performance** - Indexed queries and joins  
✅ **Easier Backups** - Standard SQL dump/restore  
✅ **Windows Integration** - Better Windows Server support  

## 🛠️ **Troubleshooting**

### Common Issues:

1. **Connection Refused**
   ```bash
   # Check if MySQL is running
   net start mysql
   ```

2. **Access Denied**
   ```bash
   # Check user permissions
   mysql -u root -p
   GRANT ALL PRIVILEGES ON cbt_local.* TO 'cbt_user'@'localhost';
   ```

3. **Database Not Found**
   ```sql
   CREATE DATABASE cbt_local;
   ```

4. **Port Already in Use**
   ```bash
   # Change port in .env file
   PORT=5101
   ```

## 📈 **Performance Optimization**

### 1. Add Indexes
```sql
-- Add indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_exams_created_by ON exams(created_by);
CREATE INDEX idx_questions_exam_id ON questions(exam_id);
CREATE INDEX idx_results_user_exam ON results(user_id, exam_id);
```

### 2. Configure MySQL
```ini
# my.cnf or my.ini
[mysqld]
innodb_buffer_pool_size = 256M
max_connections = 100
query_cache_size = 32M
```

## 🔄 **Data Migration (If Needed)**

If you have existing MongoDB data, you can create a migration script:

```javascript
// migration-script.js
const { MongoClient } = require('mongodb');
const { User, Exam, Question, Result } = require('./models');

async function migrateData() {
  // Connect to MongoDB
  const mongoClient = new MongoClient('mongodb://localhost:27017');
  await mongoClient.connect();
  const db = mongoClient.db('cbt_local');
  
  // Migrate users
  const users = await db.collection('users').find().toArray();
  for (const user of users) {
    await User.create({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      password: user.password,
      role: user.role
    });
  }
  
  // Similar for other collections...
  console.log('Migration completed!');
}
```

## ✅ **Verification Checklist**

- [ ] MySQL server is running
- [ ] Database `cbt_local` exists
- [ ] User has proper permissions
- [ ] Environment variables are set
- [ ] Dependencies are installed
- [ ] Application starts without errors
- [ ] Health endpoint returns 200
- [ ] Admin UI loads at `http://localhost:5100/admin`
- [ ] Student UI loads at `http://localhost:5100/student`

## 🎉 **Migration Complete!**

Your CBT app is now running on MySQL with:
- ✅ Better data integrity
- ✅ Relational database benefits
- ✅ Windows Server optimization
- ✅ Easier maintenance and backups
- ✅ Standard SQL queries

The application maintains all existing functionality while providing better performance and reliability for local Windows deployments.
