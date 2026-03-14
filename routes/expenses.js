const express = require('express');
const db = require('../database/connection');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper: merge expenses กับ categories ใน JS (Supabase adapter ไม่รองรับ JOIN)
function mergeWithCategories(expenses, categories) {
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  return expenses.map(e => ({
    ...e,
    category_name: catMap[e.category_id]?.name || 'อื่นๆ',
    category_color: catMap[e.category_id]?.color || '#6B7280',
    category_icon: catMap[e.category_id]?.icon || 'wallet'
  }));
}

// Get expense categories — วางก่อน routes อื่น
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await db.query(
      `SELECT * FROM expense_categories WHERE is_default = TRUE OR user_id = ? ORDER BY type, name`,
      [req.user.id]
    );
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Create custom category
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    const result = await db.query(
      `INSERT INTO expense_categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, name, type, color || '#6B7280', icon || 'wallet']
    );
    res.status(201).json({ message: 'Category created', category_id: result.insertId });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Monthly summary — วางก่อน /:id
router.get('/summary/monthly', authMiddleware, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const y = parseInt(year), m = parseInt(month);

    const allExpenses = await db.query(
      'SELECT * FROM expenses WHERE user_id = ?',
      [req.user.id]
    );

    const filtered = allExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === y && (d.getMonth() + 1) === m;
    });

    const totalIncome = filtered
      .filter(e => e.type === 'income')
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalExpense = filtered
      .filter(e => e.type === 'expense')
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    // Categories (fetch separately + merge in JS)
    const cats = await db.query(
      'SELECT * FROM expense_categories WHERE is_default = TRUE OR user_id = ?',
      [req.user.id]
    );
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c; });

    const byCategory = {};
    filtered.filter(e => e.type === 'expense').forEach(e => {
      const cid = e.category_id;
      if (!byCategory[cid]) {
        byCategory[cid] = {
          name: catMap[cid]?.name || 'อื่นๆ',
          color: catMap[cid]?.color || '#6B7280',
          icon: catMap[cid]?.icon || 'wallet',
          total: 0, count: 0
        };
      }
      byCategory[cid].total += parseFloat(e.amount || 0);
      byCategory[cid].count++;
    });

    res.json({
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        balance: totalIncome - totalExpense,
        transaction_count: filtered.length
      },
      by_category: Object.values(byCategory).sort((a, b) => b.total - a.total),
      year: y, month: m
    });
  } catch (error) {
    console.error('Get monthly summary error:', error);
    res.status(500).json({ error: 'Failed to get monthly summary' });
  }
});

// Expense trends (last 6 months) — วางก่อน /:id
router.get('/summary/trends', authMiddleware, async (req, res) => {
  try {
    const allExpenses = await db.query(
      'SELECT * FROM expenses WHERE user_id = ?',
      [req.user.id]
    );

    // Filter last 6 months in JS
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);

    const trendsMap = {};
    allExpenses
      .filter(e => new Date(e.date) >= cutoff)
      .forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (!trendsMap[key]) {
          trendsMap[key] = { year: d.getFullYear(), month: d.getMonth() + 1, income: 0, expense: 0, balance: 0 };
        }
        const amt = parseFloat(e.amount || 0);
        if (e.type === 'income') { trendsMap[key].income += amt; trendsMap[key].balance += amt; }
        else { trendsMap[key].expense += amt; trendsMap[key].balance -= amt; }
      });

    const trends = Object.values(trendsMap)
      .sort((a, b) => b.year - a.year || b.month - a.month);

    res.json({ trends });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

// Get all expenses (with category info merged in JS)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, category_id, start_date, end_date, limit = 50 } = req.query;

    const allExpenses = await db.query(
      'SELECT * FROM expenses WHERE user_id = ?',
      [req.user.id]
    );

    // Fetch categories
    const cats = await db.query(
      'SELECT * FROM expense_categories WHERE is_default = TRUE OR user_id = ?',
      [req.user.id]
    );

    // Filter in JS
    let filtered = allExpenses;
    if (type) filtered = filtered.filter(e => e.type === type);
    if (category_id) filtered = filtered.filter(e => String(e.category_id) === String(category_id));
    if (start_date) filtered = filtered.filter(e => e.date >= start_date);
    if (end_date) filtered = filtered.filter(e => e.date <= end_date);

    // Sort and limit
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    filtered = filtered.slice(0, parseInt(limit));

    // Merge category info
    const expenses = mergeWithCategories(filtered, cats);
    res.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// Create expense/income
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { category_id, type, amount, date, description } = req.body;
    const result = await db.query(
      `INSERT INTO expenses (user_id, category_id, type, amount, date, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, category_id, type, amount,
       date || new Date().toISOString().split('T')[0],
       description]
    );
    res.status(201).json({ message: 'Transaction recorded successfully', expense_id: result.insertId });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const expenseId = req.params.id;
    const updates = [];
    const values = [];
    const allowedFields = ['category_id', 'type', 'amount', 'date', 'description'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(expenseId);
    values.push(req.user.id);
    await db.query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
