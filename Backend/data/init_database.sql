-- Swasthya Project Database Schema
-- PostgreSQL initialization script

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS forecasts CASCADE;
DROP TABLE IF EXISTS staff_schedules CASCADE;
DROP TABLE IF EXISTS triage_decisions CASCADE;
DROP TABLE IF EXISTS er_queue CASCADE;
DROP TABLE IF EXISTS or_schedules CASCADE;
DROP TABLE IF EXISTS discharge_recommendations CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS inpatients CASCADE;

-- Staff table
CREATE TABLE staff (
    staff_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    max_hours_per_week INTEGER DEFAULT 40,
    qualifications TEXT[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Forecasts table
CREATE TABLE forecasts (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    predicted_volume FLOAT NOT NULL,
    confidence_lower FLOAT,
    confidence_upper FLOAT,
    model_version VARCHAR(50),
    generated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, generated_at)
);

-- Staff schedules table
CREATE TABLE staff_schedules (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) REFERENCES staff(staff_id),
    date DATE NOT NULL,
    shift VARCHAR(50) NOT NULL,
    role VARCHAR(100),
    generated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Triage decisions table
CREATE TABLE triage_decisions (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    acuity_level INTEGER NOT NULL,
    acuity_label VARCHAR(50) NOT NULL,
    confidence FLOAT,
    risk_factors JSONB,
    red_flags JSONB,
    recommended_action TEXT,
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ER Queue table
CREATE TABLE er_queue (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    acuity_level INTEGER NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'waiting',
    seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- OR Schedules table
CREATE TABLE or_schedules (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL,
    or_room INTEGER NOT NULL,
    start_time TIME NOT NULL,
    estimated_duration INTEGER,
    generated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inpatients table
CREATE TABLE inpatients (
    patient_id VARCHAR(50) PRIMARY KEY,
    admission_date TIMESTAMP NOT NULL,
    diagnosis TEXT,
    vitals JSONB,
    procedures_completed TEXT[],
    discharge_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Discharge recommendations table
CREATE TABLE discharge_recommendations (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES inpatients(patient_id),
    readiness_score FLOAT NOT NULL,
    estimated_discharge_date DATE,
    criteria_met JSONB,
    recommendations JSONB,
    generated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_forecasts_date ON forecasts(date);
CREATE INDEX idx_staff_schedules_date ON staff_schedules(date, staff_id);
CREATE INDEX idx_triage_patient ON triage_decisions(patient_id);
CREATE INDEX idx_er_queue_status ON er_queue(status, acuity_level);
CREATE INDEX idx_or_schedules_time ON or_schedules(start_time);
CREATE INDEX idx_discharge_patient ON discharge_recommendations(patient_id);
CREATE INDEX idx_inpatients_admission ON inpatients(admission_date);

-- Insert sample staff data
INSERT INTO staff (staff_id, name, role, max_hours_per_week, qualifications) VALUES
('DOC001', 'Dr. Sarah Johnson', 'doctor', 40, ARRAY['emergency_medicine', 'trauma']),
('DOC002', 'Dr. Michael Chen', 'doctor', 40, ARRAY['internal_medicine']),
('DOC003', 'Dr. Emily Williams', 'doctor', 36, ARRAY['surgery', 'orthopedics']),
('NRS001', 'Nurse Amanda Smith', 'nurse', 40, ARRAY['critical_care', 'emergency']),
('NRS002', 'Nurse David Brown', 'nurse', 40, ARRAY['medical_surgical']),
('NRS003', 'Nurse Maria Garcia', 'nurse', 36, ARRAY['pediatrics']),
('NRS004', 'Nurse James Wilson', 'nurse', 40, ARRAY['critical_care']),
('NRS005', 'Nurse Lisa Anderson', 'nurse', 40, ARRAY['emergency']),
('TECH001', 'John Martinez', 'technician', 40, ARRAY['radiology', 'imaging']),
('TECH002', 'Rachel Lee', 'technician', 40, ARRAY['laboratory']);

-- Insert sample inpatients (for testing discharge planning)
INSERT INTO inpatients (patient_id, admission_date, diagnosis, vitals, procedures_completed) VALUES
('PAT001', NOW() - INTERVAL '3 days', 'Pneumonia', '{"temperature": 37.2, "oxygen_saturation": 95, "heart_rate": 78}', ARRAY['chest_xray', 'blood_test']),
('PAT002', NOW() - INTERVAL '5 days', 'Post-surgical recovery', '{"temperature": 36.8, "oxygen_saturation": 97, "heart_rate": 72}', ARRAY['surgery', 'physical_therapy']),
('PAT003', NOW() - INTERVAL '2 days', 'Cardiac monitoring', '{"temperature": 37.0, "oxygen_saturation": 94, "heart_rate": 85}', ARRAY['ecg', 'cardiac_enzymes']);

-- Create view for current ER queue
CREATE OR REPLACE VIEW current_er_queue AS
SELECT 
    eq.patient_id,
    eq.acuity_level,
    eq.arrival_time,
    EXTRACT(EPOCH FROM (NOW() - eq.arrival_time))/60 AS wait_minutes,
    td.acuity_label,
    td.recommended_action
FROM er_queue eq
LEFT JOIN triage_decisions td ON eq.patient_id = td.patient_id
WHERE eq.status = 'waiting'
ORDER BY eq.acuity_level ASC, eq.arrival_time ASC;

-- Create view for discharge-ready patients
CREATE OR REPLACE VIEW discharge_ready_patients AS
SELECT 
    ip.patient_id,
    ip.admission_date,
    ip.diagnosis,
    dr.readiness_score,
    dr.estimated_discharge_date,
    dr.recommendations,
    EXTRACT(DAY FROM (NOW() - ip.admission_date)) AS days_admitted
FROM inpatients ip
INNER JOIN discharge_recommendations dr ON ip.patient_id = dr.patient_id
WHERE ip.discharge_date IS NULL 
  AND dr.readiness_score >= 0.7
ORDER BY dr.readiness_score DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO swasthya_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO swasthya_user;

