const db = require('./database/connection');
async function migrate() {
  try {
    // Add updated_at to chat_conversations
    try {
      await db.query(`ALTER TABLE chat_conversations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      console.log('Added updated_at to chat_conversations');
    } catch (e) {
      console.log('updated_at might already exist or table missing');
    }

    // Add metadata to chat_messages if needed
    try {
      await db.query(`ALTER TABLE chat_messages ADD COLUMN metadata JSONB`);
      console.log('Added metadata to chat_messages');
    } catch (e) {
      console.log('metadata might already exist');
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
migrate();
