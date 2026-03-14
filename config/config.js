require('dotenv').config();

// Check if Supabase is configured
const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'smart-student-secret-key-2024',
  useSupabase: !!useSupabase,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_student_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
};
