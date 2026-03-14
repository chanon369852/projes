// Supabase PostgreSQL Connection — Improved Adapter
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: parse WHERE conditions and apply to supabase query
function applyWhere(query, whereStr, params, startIdx = 0) {
  if (!whereStr) return { query, nextIdx: startIdx };
  let idx = startIdx;
  const conditions = whereStr.trim().split(/\s+AND\s+/i);

  for (const cond of conditions) {
    const c = cond.trim();

    // IS TRUE / IS FALSE
    if (/=\s*TRUE\b/i.test(c)) {
      const col = c.match(/(\w+)\s*=\s*TRUE/i)?.[1];
      if (col) query = query.eq(col, true);
      continue;
    }
    if (/=\s*FALSE\b/i.test(c)) {
      const col = c.match(/(\w+)\s*=\s*FALSE/i)?.[1];
      if (col) query = query.eq(col, false);
      continue;
    }

    // col != 'string'
    const neqStrMatch = c.match(/(\w+)\s*!=\s*'([^']+)'/);
    if (neqStrMatch) { query = query.neq(neqStrMatch[1], neqStrMatch[2]); continue; }

    // col = 'string'
    const eqStrMatch = c.match(/(\w+)\s*=\s*'([^']+)'/);
    if (eqStrMatch) { query = query.eq(eqStrMatch[1], eqStrMatch[2]); continue; }

    // col != ?
    const neqMatch = c.match(/(\w+)\s*!=\s*\?/) || c.match(/(\w+)\s*<>\s*\?/);
    if (neqMatch && params[idx] !== undefined) {
      query = query.neq(neqMatch[1], params[idx++]); continue;
    }

    // col = ?
    const eqMatch = c.match(/(\w+)\s*=\s*\?/);
    if (eqMatch && params[idx] !== undefined) {
      query = query.eq(eqMatch[1], params[idx++]); continue;
    }

    // OR conditions: (col1 = ? OR col2 = ?)
    const orMatch = c.match(/\(?\s*(\w+)\s*=\s*\?\s*OR\s*(\w+)\s*=\s*\?\s*\)?/i);
    if (orMatch && params[idx] !== undefined) {
      query = query.or(`${orMatch[1]}.eq.${params[idx]},${orMatch[2]}.eq.${params[idx + 1]}`);
      idx += 2; continue;
    }
  }

  return { query, nextIdx: idx };
}

class SupabaseDatabase {
  async query(sql, params = []) {
    try {
      const trimmed = sql.trim();
      const upper = trimmed.toUpperCase().trimStart();

      if (upper.startsWith('SELECT')) return await this.handleSelect(trimmed, params);
      if (upper.startsWith('INSERT')) return await this.handleInsert(trimmed, params);
      if (upper.startsWith('UPDATE')) return await this.handleUpdate(trimmed, params);
      if (upper.startsWith('DELETE')) return await this.handleDelete(trimmed, params);
      if (upper.startsWith('CALL')) {
        console.warn('[supabase.js] CALL (Stored Procedure) ไม่รองรับ:', trimmed.substring(0, 60));
        return [];
      }

      console.warn('[supabase.js] Unsupported SQL:', trimmed.substring(0, 60));
      return [];
    } catch (error) {
      console.error('[supabase.js] Query error:', error.message, '\nSQL:', sql.substring(0, 100));
      throw error;
    }
  }

  async handleSelect(sql, params) {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) throw new Error('Cannot extract table name from SELECT');
    const table = tableMatch[1];

    let query = supabase.from(table).select('*');

    // WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|GROUP\s+BY|LIMIT|HAVING|$)/is);
    if (whereMatch) {
      const result = applyWhere(query, whereMatch[1], params, 0);
      query = result.query;
    }

    // ORDER BY (simple columns only)
    const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:LIMIT|$)/is);
    if (orderMatch) {
      const parts = orderMatch[1].trim().split(',');
      for (const part of parts) {
        const tokens = part.trim().split(/\s+/);
        const colRaw = tokens[0].includes('.') ? tokens[0].split('.')[1] : tokens[0];
        if (colRaw && /^\w+$/.test(colRaw)) {
          query = query.order(colRaw, { ascending: tokens[1]?.toUpperCase() !== 'DESC' });
        }
      }
    }

    // LIMIT
    const limitNumMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitNumMatch) {
      query = query.limit(parseInt(limitNumMatch[1]));
    } else {
      // LIMIT ? — last numeric param
      const lastParam = params[params.length - 1];
      if (sql.match(/LIMIT\s+\?/i) && typeof lastParam === 'number') {
        query = query.limit(lastParam);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async handleInsert(sql, params) {
    const tableMatch = sql.match(/INTO\s+(\w+)/i);
    if (!tableMatch) throw new Error('Cannot extract table name from INSERT');
    const table = tableMatch[1];

    const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
    if (!columnsMatch) throw new Error('Cannot extract columns from INSERT');

    const columns = columnsMatch[1].split(',').map(c => c.trim());
    const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/is);
    const valueTokens = valuesMatch
      ? valuesMatch[1].split(',').map(v => v.trim())
      : [];

    const data = {};
    let paramIdx = 0;

    columns.forEach((col, i) => {
      const token = valueTokens[i] || '?';
      if (/NOW\(\)|CURRENT_TIMESTAMP/i.test(token)) {
        data[col] = new Date().toISOString();
      } else if (token === '?' && params[paramIdx] !== undefined) {
        data[col] = params[paramIdx++];
      } else if (/^NULL$/i.test(token)) {
        data[col] = null;
      }
    });

    const { data: result, error } = await supabase.from(table).insert(data).select();
    if (error) throw error;
    return { insertId: result?.[0]?.id, affectedRows: result?.length || 1 };
  }

  async handleUpdate(sql, params) {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (!tableMatch) throw new Error('Cannot extract table name from UPDATE');
    const table = tableMatch[1];

    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
    if (!setMatch) throw new Error('UPDATE requires WHERE clause');

    const data = {};
    const setParts = setMatch[1].split(',');
    let paramIdx = 0;

    for (const part of setParts) {
      const p = part.trim();
      // col = NOW()
      if (/(\w+)\s*=\s*NOW\(\)/i.test(p)) {
        const col = p.match(/(\w+)\s*=/)[1];
        data[col] = new Date().toISOString();
        continue;
      }
      // col = TRUE/FALSE
      const boolMatch = p.match(/(\w+)\s*=\s*(TRUE|FALSE)/i);
      if (boolMatch) {
        data[boolMatch[1]] = boolMatch[2].toUpperCase() === 'TRUE';
        continue;
      }
      // col = ?
      const eqMatch = p.match(/(\w+)\s*=\s*\?/);
      if (eqMatch && params[paramIdx] !== undefined) {
        data[eqMatch[1]] = params[paramIdx++];
      }
    }

    // WHERE clause — compound conditions supported (id = ? AND user_id = ?)
    const whereMatch = sql.match(/WHERE\s+(.+?)$/is);
    let query = supabase.from(table).update(data);

    if (whereMatch) {
      const result = applyWhere(query, whereMatch[1], params, paramIdx);
      query = result.query;
    }

    const { data: res, error } = await query.select();
    if (error) throw error;
    return { affectedRows: res?.length || 0 };
  }

  async handleDelete(sql, params) {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) throw new Error('Cannot extract table name from DELETE');
    const table = tableMatch[1];

    let query = supabase.from(table).delete();

    // WHERE clause — compound conditions supported
    const whereMatch = sql.match(/WHERE\s+(.+?)$/is);
    if (whereMatch) {
      const result = applyWhere(query, whereMatch[1], params, 0);
      query = result.query;
    }

    const { data: res, error } = await query.select();
    if (error) throw error;
    return { affectedRows: res?.length || 0 };
  }

  async transaction(callback) {
    try {
      return await callback(supabase);
    } catch (error) {
      throw error;
    }
  }
}

console.log('Supabase connected');
module.exports = new SupabaseDatabase();
