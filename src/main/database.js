const path = require('path');
const { app } = require('electron');

class Database {
  constructor() { this.db = null; }

  initialize() {
    const BetterSQLite = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'study-organizer.db');
    this.db = new BetterSQLite(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.createTables();
    this.seedDefaultSubjects();
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6b7280',
        description TEXT DEFAULT '',
        topics TEXT DEFAULT '',
        refs TEXT DEFAULT '',
        observations TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS weekly_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
        subject_id INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE(day_of_week, subject_id)
      );
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration_minutes REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );
    `);
  }

  seedDefaultSubjects() {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM subjects').get();
    if (count.c === 0) {
      const ins = this.db.prepare('INSERT INTO subjects (name, color) VALUES (?, ?)');
      [['Matematica','#3b82f6'],['Computacao Grafica','#10b981'],['Sistemas Distribuidos','#8b5cf6']]
        .forEach(([n,c]) => ins.run(n,c));
    }
  }

  getAllSubjects() {
    return this.db.prepare('SELECT * FROM subjects ORDER BY name').all();
  }
  createSubject({ name, color = '#6b7280', description = '' }) {
    const r = this.db.prepare('INSERT INTO subjects (name,color,description) VALUES (?,?,?)').run(name,color,description);
    return this.db.prepare('SELECT * FROM subjects WHERE id=?').get(r.lastInsertRowid);
  }
  updateSubject({ id, name, color, description }) {
    this.db.prepare('UPDATE subjects SET name=?,color=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name,color,description,id);
    return this.db.prepare('SELECT * FROM subjects WHERE id=?').get(id);
  }
  deleteSubject(id) { return this.db.prepare('DELETE FROM subjects WHERE id=?').run(id); }
  getSubjectNotes(id) { return this.db.prepare('SELECT * FROM subjects WHERE id=?').get(id); }
  saveSubjectNotes({ id, description, topics, refs, observations }) {
    this.db.prepare('UPDATE subjects SET description=?,topics=?,refs=?,observations=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(description,topics,refs,observations,id);
    return this.db.prepare('SELECT * FROM subjects WHERE id=?').get(id);
  }

  getWeeklyPlan() {
    return this.db.prepare(`SELECT wp.*,s.name as subject_name,s.color as subject_color FROM weekly_plan wp JOIN subjects s ON s.id=wp.subject_id ORDER BY wp.day_of_week,wp.sort_order`).all();
  }
  setWeeklyPlan({ day_of_week, subject_id, sort_order = 0 }) {
    return this.db.prepare('INSERT OR IGNORE INTO weekly_plan (day_of_week,subject_id,sort_order) VALUES (?,?,?)').run(day_of_week,subject_id,sort_order);
  }
  removeWeeklyPlan({ day_of_week, subject_id }) {
    return this.db.prepare('DELETE FROM weekly_plan WHERE day_of_week=? AND subject_id=?').run(day_of_week,subject_id);
  }

  createSession({ subject_id, start_time, end_time, duration_minutes, notes = '' }) {
    const r = this.db.prepare('INSERT INTO study_sessions (subject_id,start_time,end_time,duration_minutes,notes) VALUES (?,?,?,?,?)').run(subject_id,start_time,end_time,duration_minutes,notes);
    return this.db.prepare('SELECT * FROM study_sessions WHERE id=?').get(r.lastInsertRowid);
  }
  getStats() {
    return this.db.prepare(`SELECT s.id,s.name,s.color,COALESCE(SUM(ss.duration_minutes),0) as total_minutes,COUNT(ss.id) as session_count FROM subjects s LEFT JOIN study_sessions ss ON ss.subject_id=s.id GROUP BY s.id ORDER BY total_minutes DESC`).all();
  }
  getWeeklyStats() {
    return this.db.prepare(`SELECT s.id,s.name,s.color,COALESCE(SUM(ss.duration_minutes),0) as total_minutes FROM subjects s LEFT JOIN study_sessions ss ON ss.subject_id=s.id AND ss.start_time>=date('now','-6 days') GROUP BY s.id ORDER BY total_minutes DESC`).all();
  }
  getMonthlyStats() {
    return this.db.prepare(`SELECT s.id,s.name,s.color,COALESCE(SUM(ss.duration_minutes),0) as total_minutes FROM subjects s LEFT JOIN study_sessions ss ON ss.subject_id=s.id AND strftime('%Y-%m',ss.start_time)=strftime('%Y-%m','now') GROUP BY s.id ORDER BY total_minutes DESC`).all();
  }
  getRecentSessions() {
    return this.db.prepare(`SELECT ss.*,s.name as subject_name,s.color as subject_color FROM study_sessions ss JOIN subjects s ON s.id=ss.subject_id ORDER BY ss.start_time DESC LIMIT 20`).all();
  }
}
module.exports = Database;
