import multer from 'multer';
import path from 'path';
import fs from 'fs';

const getUploadDir = (subfolder: string = ''): string => {
  const base = fs.existsSync('/var/data')
    ? '/var/data/uploads'
    : path.resolve(process.cwd(), 'uploads');
  const target = subfolder ? path.join(base, subfolder) : base;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
};

// Storage for Medical Records
const medicalRecordsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir('medical_records'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `record-${uniqueSuffix}${ext}`);
  }
});

// Storage for AI Report Explainer
const aiReportsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir('ai_reports'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `lab-report-${uniqueSuffix}${ext}`);
  }
});

// Storage for Doctor Certificates
const doctorDocsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir('doctor_docs'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

// Filter for valid documents (PDF, JPG, PNG, WEBP)
const documentFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'text/plain'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, JPG, PNG, and WEBP files are accepted.'));
  }
};

export const uploadRecord = multer({
  storage: medicalRecordsStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: documentFilter
});

// Middleware that accepts either 'file' or 'document' form field
export const uploadMedicalRecordMiddleware = (req: any, res: any, next: any) => {
  uploadRecord.fields([
    { name: 'file', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ])(req, res, (err: any) => {
    if (err) return next(err);
    if (req.files) {
      if (req.files['document'] && req.files['document'][0]) {
        req.file = req.files['document'][0];
      } else if (req.files['file'] && req.files['file'][0]) {
        req.file = req.files['file'][0];
      }
    }
    next();
  });
};

export const uploadReport = multer({
  storage: aiReportsStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: documentFilter
});

export const uploadDoctorCert = multer({
  storage: doctorDocsStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max
  fileFilter: documentFilter
});
