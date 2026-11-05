import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path in persistent disk (/var/data on Render) or local directory
const defaultDbPath = fs.existsSync('/var/data')
  ? '/var/data/caresphere.db'
  : path.resolve(__dirname, '../../caresphere.db');
const DB_PATH = process.env.DATABASE_FILE || defaultDbPath;

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrency and Foreign Keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  const schemaCandidates = [
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../../src/db/schema.sql'),
    path.resolve(__dirname, '../src/db/schema.sql'),
    path.resolve(process.cwd(), 'server/src/db/schema.sql'),
    path.resolve(process.cwd(), 'server/dist/db/schema.sql'),
    path.resolve(process.cwd(), 'src/db/schema.sql')
  ];
  
  const schemaPath = schemaCandidates.find(p => fs.existsSync(p));
  if (!schemaPath) {
    throw new Error(`CareSphere schema file not found. Candidates checked: ${schemaCandidates.join(', ')}`);
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Execute schema
  db.exec(schemaSql);

  // Auto-migrate doctor_profiles columns if table already exists
  try {
    const columns = db.prepare('PRAGMA table_info(doctor_profiles)').all() as { name: string }[];
    const colNames = new Set(columns.map(c => c.name));

    if (!colNames.has('state_medical_council')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN state_medical_council TEXT DEFAULT 'National Medical Commission (NMC)'");
    }
    if (!colNames.has('council_certificate_url')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN council_certificate_url TEXT");
    }
    if (!colNames.has('degree_certificate_url')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN degree_certificate_url TEXT");
    }
    if (!colNames.has('id_proof_url')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN id_proof_url TEXT");
    }
    if (!colNames.has('verification_checklist')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN verification_checklist TEXT");
    }
    if (!colNames.has('room_number')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN room_number TEXT DEFAULT 'Chamber 101'");
    }
    if (!colNames.has('floor')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN floor TEXT DEFAULT '1st Floor'");
    }
    if (!colNames.has('wing')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN wing TEXT DEFAULT 'Block A - Clinical Wing'");
    }
    if (!colNames.has('current_presence_status')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN current_presence_status TEXT DEFAULT 'in_opd'");
    }
    if (!colNames.has('navigation_instructions')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN navigation_instructions TEXT");
    }
    if (!colNames.has('hospital_name')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN hospital_name TEXT DEFAULT 'CareSphere Super Specialty Hospital'");
    }
    if (!colNames.has('hospital_location')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN hospital_location TEXT DEFAULT 'Main Campus, Bengaluru'");
    }
    if (!colNames.has('hospital_id')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id)");
    }
    if (!colNames.has('teleconsultation_available')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN teleconsultation_available INTEGER DEFAULT 1");
    }
    if (!colNames.has('teleconsultation_fee')) {
      db.exec("ALTER TABLE doctor_profiles ADD COLUMN teleconsultation_fee INTEGER DEFAULT 500");
    }

    // Auto-migrate users columns and role check if needed
    const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
    const userColNames = new Set(userColumns.map(c => c.name));
    if (!userColNames.has('hospital_id')) {
      db.exec("ALTER TABLE users ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id)");
    }

    // Check if users table needs constraint upgrade for hospital_admin / superadmin
    const userSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql: string } | undefined;
    if (userSqlRow && userSqlRow.sql && !userSqlRow.sql.includes('hospital_admin')) {
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec(`
        CREATE TABLE users_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin', 'hospital_admin', 'superadmin')),
          preferred_language TEXT NOT NULL DEFAULT 'en',
          hospital_id INTEGER REFERENCES hospitals(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users_migrated (id, name, email, phone, password_hash, role, preferred_language, hospital_id, created_at, updated_at)
          SELECT id, name, email, phone, password_hash, role, preferred_language, hospital_id, created_at, updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);
      db.exec("PRAGMA foreign_keys=ON;");
    }

    // Auto-migrate appointments columns
    const apptColumns = db.prepare('PRAGMA table_info(appointments)').all() as { name: string }[];
    const apptColNames = new Set(apptColumns.map(c => c.name));
    if (!apptColNames.has('consultation_type')) {
      db.exec("ALTER TABLE appointments ADD COLUMN consultation_type TEXT DEFAULT 'in_person'");
    }
    if (!apptColNames.has('video_room_id')) {
      db.exec("ALTER TABLE appointments ADD COLUMN video_room_id TEXT");
    }
    if (!apptColNames.has('video_session_status')) {
      db.exec("ALTER TABLE appointments ADD COLUMN video_session_status TEXT DEFAULT 'scheduled'");
    }
    if (!apptColNames.has('meeting_link')) {
      db.exec("ALTER TABLE appointments ADD COLUMN meeting_link TEXT");
    }
    if (!apptColNames.has('prescription_url')) {
      db.exec("ALTER TABLE appointments ADD COLUMN prescription_url TEXT");
    }
    if (!apptColNames.has('hospital_id')) {
      db.exec("ALTER TABLE appointments ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id)");
    }
  } catch (migErr) {
    console.error('Migration note:', migErr);
  }
}

// Log audit helper
export function logAudit(
  userId: number | null,
  userName: string | null,
  userRole: string | null,
  action: string,
  resource: string,
  resourceId: string | null = null,
  details: string | null = null,
  ipAddress: string | null = null
): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, user_role, action, resource, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, userName, userRole, action, resource, resourceId, details, ipAddress);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
