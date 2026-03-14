// SQLite Fallback for Development (No MySQL required)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteDatabase {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'));
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table
        this.db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id TEXT UNIQUE,
          email TEXT UNIQUE,
          password TEXT,
          full_name TEXT,
          nickname TEXT,
          faculty TEXT,
          major TEXT,
          year INTEGER DEFAULT 1,
          university TEXT,
          phone TEXT,
          avatar_url TEXT,
          monthly_budget REAL DEFAULT 5000,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Schedules table
        this.db.run(`CREATE TABLE IF NOT EXISTS schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          subject_code TEXT,
          subject_name TEXT,
          teacher TEXT,
          building TEXT,
          room TEXT,
          day_of_week INTEGER,
          start_time TEXT,
          end_time TEXT,
          color TEXT DEFAULT '#3B82F6',
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tasks table
        this.db.run(`CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT,
          description TEXT,
          subject TEXT,
          deadline DATETIME,
          priority TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Expenses table
        this.db.run(`CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          type TEXT,
          amount REAL,
          date TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('SQLite database initialized');
        resolve();
      });
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      // Convert MySQL style ? to SQLite $1, $2, etc
      let sqliteSql = sql;
      params.forEach((_, i) => {
        sqliteSql = sqliteSql.replace('?', `$${i + 1}`);
      });

      if (sql.trim().toLowerCase().startsWith('select')) {
        this.db.all(sqliteSql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.db.run(sqliteSql, params, function(err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      }
    });
  }
}

module.exports = new SQLiteDatabase();
