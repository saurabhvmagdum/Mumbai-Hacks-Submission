-- Swasthya Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    aadhaar_number VARCHAR(12) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'hospital', 'superadmin')),
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals table (for hospital accounts)
CREATE TABLE IF NOT EXISTS hospitals (
    hospital_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode VARCHAR(10),
    phone VARCHAR(15),
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table (for patient profiles)
CREATE TABLE IF NOT EXISTS patients (
    patient_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT,
    blood_group TEXT,
    phone VARCHAR(15),
    email TEXT,
    address TEXT,
    emergency_contact TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospital assignments (for superadmin)
CREATE TABLE IF NOT EXISTS hospital_assignments (
    assignment_id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(user_id),
    assignment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient records (accessible by hospitals)
CREATE TABLE IF NOT EXISTS patient_records (
    record_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(patient_id) ON DELETE CASCADE,
    hospital_id INTEGER REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    record_type TEXT,
    diagnosis TEXT,
    treatment TEXT,
    doctor_name TEXT,
    record_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_aadhaar ON users(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_hospitals_user_id ON hospitals(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

