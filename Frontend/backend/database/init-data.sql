-- Initialize default users
-- Password: patient123 (hashed)
INSERT INTO users (aadhaar_number, password, role, name) VALUES
('123412341234', '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'patient', 'John Patient')
ON CONFLICT (aadhaar_number) DO NOTHING;

-- Password: hospital123 (hashed)
INSERT INTO users (aadhaar_number, password, role, name) VALUES
('987698769876', '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'hospital', 'City General Hospital')
ON CONFLICT (aadhaar_number) DO NOTHING;

-- Password: admin123 (hashed)
INSERT INTO users (aadhaar_number, password, role, name) VALUES
('111122223333', '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'superadmin', 'System Administrator')
ON CONFLICT (aadhaar_number) DO NOTHING;

