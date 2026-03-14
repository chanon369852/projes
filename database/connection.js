const mysql = require('mysql2/promise');
const config = require('../config/config');

// Use Supabase if configured, otherwise use MySQL
if (config.useSupabase) {
  console.log('Using Supabase (PostgreSQL)');
  module.exports = require('./supabase');
  return;
}

class Database {
  constructor() {
    this.pool = null;
    this.maxRetries = 5;
    this.retryDelay = 5000;
    this.init();
  }

  async init() {
    try {
      this.pool = mysql.createPool({
        ...config.db,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });

      const connection = await this.pool.getConnection();
      console.log('Database connected successfully');
      connection.release();

    } catch (error) {
      console.error('Database initialization error:', error.message);
      await this.retryInit();
    }
  }

  async retryInit() {
    for (let i = 1; i <= this.maxRetries; i++) {
      console.log(`Retrying database connection (${i}/${this.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      try {
        this.pool = mysql.createPool(config.db);
        const connection = await this.pool.getConnection();
        console.log('Database reconnected successfully');
        connection.release();
        return;
      } catch (error) {
        console.error(`Retry ${i} failed:`, error.message);
      }
    }
    
    console.error('All database connection retries failed');
    process.exit(1);
  }

  async query(sql, params) {
    let retries = 0;
    const maxQueryRetries = 3;

    while (retries < maxQueryRetries) {
      try {
        const connection = await this.pool.getConnection();
        try {
          const [results] = await connection.execute(sql, params);
          return results;
        } finally {
          connection.release();
        }
      } catch (error) {
        retries++;
        console.error(`Query error (attempt ${retries}/${maxQueryRetries}):`, error.message);
        
        if (retries >= maxQueryRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async transaction(callback) {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new Database();
