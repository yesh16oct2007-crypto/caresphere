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

    // Check if users table needs constraint upgrade for hospital_admin / superadmin / pharmacy_staff / lab_staff
    const userSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql: string } | undefined;
    if (userSqlRow && userSqlRow.sql && (!userSqlRow.sql.includes('pharmacy_staff') || !userSqlRow.sql.includes('lab_staff'))) {
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec(`
        CREATE TABLE users_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin', 'hospital_admin', 'superadmin', 'pharmacy_staff', 'lab_staff')),
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

    // Auto-migrate medical_records table check constraint to support scan_imaging and vaccination
    const mrSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='medical_records'").get() as { sql: string } | undefined;
    if (mrSqlRow && mrSqlRow.sql && !mrSqlRow.sql.includes('scan_imaging')) {
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec(`
        CREATE TABLE medical_records_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          document_type TEXT NOT NULL CHECK(document_type IN ('lab_report', 'prescription', 'scan_imaging', 'radiology_scan', 'discharge_summary', 'consultation_note', 'vaccination', 'other')),
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          hospital_name TEXT,
          doctor_name TEXT,
          record_date TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO medical_records_migrated SELECT * FROM medical_records;
        DROP TABLE medical_records;
        ALTER TABLE medical_records_migrated RENAME TO medical_records;
      `);
      db.exec("PRAGMA foreign_keys=ON;");
    }

    // Auto-migrate pharmacies table for pharmacy_type and city
    const pharmColumns = db.prepare('PRAGMA table_info(pharmacies)').all() as { name: string }[];
    const pharmColNames = new Set(pharmColumns.map(c => c.name));
    if (!pharmColNames.has('pharmacy_type')) {
      db.exec("ALTER TABLE pharmacies ADD COLUMN pharmacy_type TEXT DEFAULT 'hospital_counter'");
    }
    if (!pharmColNames.has('city')) {
      db.exec("ALTER TABLE pharmacies ADD COLUMN city TEXT DEFAULT 'Bengaluru'");
    }

    // Seed partner pharmacies & central warehouses if not present
    const partnerCount = db.prepare("SELECT COUNT(*) as count FROM pharmacies WHERE name LIKE '%Apollo%' OR name LIKE '%MedPlus%' OR name LIKE '%Warehouse%'").get() as any;
    if (!partnerCount || partnerCount.count === 0) {
      const h1 = (db.prepare('SELECT id FROM hospitals LIMIT 1').get() as any)?.id || 1;
      const h2 = (db.prepare('SELECT id FROM hospitals LIMIT 1 OFFSET 1').get() as any)?.id || h1;

      const ins = db.prepare(`
        INSERT INTO pharmacies (hospital_id, name, license_number, location, contact_phone, email, operating_hours, offers_delivery, delivery_fee, is_active, pharmacy_type, city)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?)
      `);

      ins.run(h1, 'Apollo Pharmacy Partner Network - Koramangala Hub', 'DL-KA-BLR-APL-4091', '80 Feet Road, 4th Block, Koramangala, Bengaluru', '+91-80-4112-9900', 'apollo.koramangala@partner.caresphere.health', '24x7 Open', 40, 'retail_partner', 'Bengaluru');
      ins.run(h1, 'MedPlus Diagnostic & Pharmacy Partner - Indiranagar', 'DL-KA-BLR-MPL-5521', '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru', '+91-80-2521-8833', 'medplus.indiranagar@partner.caresphere.health', '7:00 AM - 11:30 PM', 35, 'retail_partner', 'Bengaluru');
      ins.run(h2, 'Wellness Forever 24x7 Partner Pharmacy - Anna Nagar', 'DL-TN-CHN-WFR-1194', '2nd Avenue, Anna Nagar East, Chennai', '+91-44-2621-4455', 'wellness.annanagar@partner.caresphere.health', '24x7 Open', 45, 'retail_partner', 'Chennai');
      ins.run(h1, 'CareSphere National Digital Warehouse & Express Delivery', 'DL-IN-NAT-CSD-0001', 'Logistics Park, Hosur Road, Bengaluru (All-India Express Dispatch)', '+91-1800-202-9988', 'express.warehouse@caresphere.health', '24x7 Express Dispatch', 50, 'central_warehouse', 'All-India');

      // Populate inventory for all pharmacies across all catalogued medicines
      const allPharmIds = (db.prepare('SELECT id FROM pharmacies').all() as any[]).map(p => p.id);
      const allMedIds = (db.prepare('SELECT id FROM medicines').all() as any[]).map(m => m.id);
      const insInv = db.prepare(`
        INSERT OR IGNORE INTO pharmacy_inventory (pharmacy_id, medicine_id, batch_number, expiry_date, mrp_price, selling_price, stock_quantity, low_stock_threshold, is_available)
        VALUES (?, ?, 'CS-BATCH-2026', '2028-12-31', 120.0, 95.0, 100, 15, 1)
      `);
      for (const p of allPharmIds) {
        for (const mId of allMedIds) {
          insInv.run(p, mId);
        }
      }
    }

    // Auto-seed registered network hospitals across all partner chains (Apollo, Fortis, Manipal, Max, Narayana)
    const hospPartnerCount = db.prepare("SELECT COUNT(*) as count FROM hospitals WHERE name LIKE '%Apollo%' OR name LIKE '%Fortis%' OR name LIKE '%Manipal%'").get() as any;
    if (!hospPartnerCount || hospPartnerCount.count === 0) {
      const insHosp = db.prepare(`
        INSERT OR IGNORE INTO hospitals (name, code, location, city, state, address, contact_phone, contact_email, emergency_hotline, rating, total_beds, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      insHosp.run('Apollo Hospitals - Bannerghatta', 'APL-BLR-01', 'Bannerghatta Main Road, Opposite IIMB', 'Bengaluru', 'Karnataka', '154/11, Bannerghatta Main Rd, Bengaluru 560076', '+91-80-2630-4050', 'apollo.blr@partner.caresphere.health', '1066', 4.9, 250);
      insHosp.run('Fortis Hospital - Cunningham Road', 'FOR-BLR-01', '14, Cunningham Road, Vasanth Nagar', 'Bengaluru', 'Karnataka', '14, Cunningham Rd, Vasanth Nagar, Bengaluru 560052', '+91-80-4199-4444', 'fortis.blr@partner.caresphere.health', '105711', 4.8, 200);
      insHosp.run('Manipal Hospital - Old Airport Road', 'MAN-BLR-01', '98, HAL Old Airport Road, Kodihalli', 'Bengaluru', 'Karnataka', '98, HAL Old Airport Rd, Kodihalli, Bengaluru 560017', '+91-80-2502-4444', 'manipal.blr@partner.caresphere.health', '+91-80-2502-3333', 4.9, 300);
      insHosp.run('Max Super Specialty Hospital - Saket', 'MAX-DEL-01', '1, 2, Press Enclave Marg, Saket', 'New Delhi', 'Delhi', '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi 110017', '+91-11-2651-5050', 'max.delhi@partner.caresphere.health', '+91-11-4055-4055', 4.9, 320);
      insHosp.run('Narayana Multispeciality Hospital - Whitefield', 'NAR-BLR-01', '3 & 4, ITPL Main Road, KIADB Area', 'Bengaluru', 'Karnataka', '3 & 4, ITPL Main Rd, KIADB Export Promotion Industrial Area, Bengaluru 560066', '+91-80-7122-2222', 'narayana.blr@partner.caresphere.health', '+91-80-7122-2999', 4.7, 180);
    }

    // Link doctors to diverse partner hospitals so all hospitals have verified specialists
    const apolloRow = db.prepare("SELECT id FROM hospitals WHERE name LIKE '%Apollo%' LIMIT 1").get() as any;
    const fortisRow = db.prepare("SELECT id FROM hospitals WHERE name LIKE '%Fortis%' LIMIT 1").get() as any;
    const manipalRow = db.prepare("SELECT id FROM hospitals WHERE name LIKE '%Manipal%' LIMIT 1").get() as any;

    if (apolloRow && fortisRow && manipalRow) {
      db.prepare("UPDATE doctor_profiles SET hospital_id = ?, hospital_name = 'Apollo Hospitals - Bannerghatta', hospital_location = 'Bannerghatta Main Road, Opposite IIMB' WHERE id = 4").run(apolloRow.id);
      db.prepare("UPDATE doctor_profiles SET hospital_id = ?, hospital_name = 'Fortis Hospital - Cunningham Road', hospital_location = '14, Cunningham Road, Vasanth Nagar', verification_status = 'verified' WHERE id = 5").run(fortisRow.id);
      db.prepare("UPDATE doctor_profiles SET hospital_id = ?, hospital_name = 'Manipal Hospital - Old Airport Road', hospital_location = '98, HAL Old Airport Road, Kodihalli', verification_status = 'verified' WHERE id = 6").run(manipalRow.id);
    }

    const maxRow = db.prepare("SELECT id FROM hospitals WHERE name LIKE '%Max%' LIMIT 1").get() as any;
    const narayanaRow = db.prepare("SELECT id FROM hospitals WHERE name LIKE '%Narayana%' LIMIT 1").get() as any;

    if (maxRow && narayanaRow) {
      const docVikram = db.prepare("SELECT id FROM users WHERE email = 'dr.vikram@partner.caresphere.health'").get() as any;
      if (!docVikram) {
        const docPass = '$2a$10$wTqgI7Xo94s9p2w0PqK0yeLzG39P1wL3zHh8C8a2tZ0n3ZqLqT7q2';
        const insU = db.prepare("INSERT INTO users (name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, 'doctor', 'en')");
        const u7 = insU.run('Dr. Vikram Seth', 'dr.vikram@partner.caresphere.health', '+91-9876543207', docPass);
        const u7Id = Number(u7.lastInsertRowid);
        const insDp = db.prepare(`
          INSERT INTO doctor_profiles (user_id, hospital_id, hospital_name, hospital_location, registration_number, state_medical_council, department_id, specialization, qualifications, experience_years, consultation_fee, bio, verification_status, verified_at)
          VALUES (?, ?, 'Max Super Specialty Hospital - Saket', '1, 2, Press Enclave Marg, Saket', 'DMC-2015-88312', 'Delhi Medical Council', 1, 'Senior Consultant Cardiologist', 'MBBS, MD, DM (Cardiology)', 14, 800, 'Interventional cardiologist at Max Hospital specializing in complex angioplasties.', 'verified', datetime('now'))
        `);
        insDp.run(u7Id, maxRow.id);
      }

      const docMeena = db.prepare("SELECT id FROM users WHERE email = 'dr.meenakshi@partner.caresphere.health'").get() as any;
      if (!docMeena) {
        const docPass = '$2a$10$wTqgI7Xo94s9p2w0PqK0yeLzG39P1wL3zHh8C8a2tZ0n3ZqLqT7q2';
        const insU = db.prepare("INSERT INTO users (name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, 'doctor', 'en')");
        const u8 = insU.run('Dr. Meenakshi Iyer', 'dr.meenakshi@partner.caresphere.health', '+91-9876543208', docPass);
        const u8Id = Number(u8.lastInsertRowid);
        const insDp = db.prepare(`
          INSERT INTO doctor_profiles (user_id, hospital_id, hospital_name, hospital_location, registration_number, state_medical_council, department_id, specialization, qualifications, experience_years, consultation_fee, bio, verification_status, verified_at)
          VALUES (?, ?, 'Narayana Multispeciality Hospital - Whitefield', '3 & 4, ITPL Main Road, Whitefield', 'KMC-2017-91022', 'Karnataka Medical Council', 3, 'Consultant Pediatrician', 'MBBS, MD (Pediatrics)', 9, 650, 'Pediatric consultant at Narayana Multispeciality Hospital Whitefield.', 'verified', datetime('now'))
        `);
        insDp.run(u8Id, narayanaRow.id);
      }
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
