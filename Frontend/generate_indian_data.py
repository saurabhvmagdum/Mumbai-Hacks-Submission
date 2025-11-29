#!/usr/bin/env python3
"""
Generate 20,000 Indian dummy records for Swasthya Database

This script generates realistic Indian data for all database tables:
- users (20,000 records)
- hospitals (20,000 records)
- patients (20,000 records)
- hospital_assignments (20,000 records)
- patient_records (20,000 records)

Outputs:
- SQL INSERT statements file: backend/database/indian_data_inserts.sql
- CSV files: backend/database/csv_data/*.csv

Usage:
    pip install -r requirements-data.txt
    python generate_indian_data.py
"""

import os
import csv
import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from faker import Faker
import bcrypt

# Configuration
RECORDS_PER_TABLE = 20000
DEFAULT_PASSWORD = "Password123!"
BCRYPT_ROUNDS = 10

# Initialize Faker with Indian locale
fake = Faker('en_IN')
Faker.seed(42)  # For reproducibility
random.seed(42)

# Indian states and cities
INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir'
]

INDIAN_CITIES = {
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    'Delhi': ['New Delhi', 'Delhi'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
    'Punjab': ['Chandigarh', 'Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
    'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba'],
    'Himachal Pradesh': ['Shimla', 'Mandi', 'Solan', 'Dharamshala'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital'],
    'Goa': ['Panaji', 'Vasco da Gama', 'Margao'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
    'Jammu and Kashmir': ['Srinagar', 'Jammu'],
}

BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
GENDERS = ['Male', 'Female', 'Other']
RECORD_TYPES = ['Consultation', 'Diagnosis', 'Treatment', 'Follow-up', 'Emergency', 'Surgery', 'Checkup']
STATUS_OPTIONS = ['active', 'inactive', 'pending']

# Common Indian diseases/conditions
DIAGNOSES = [
    'Diabetes Type 2', 'Hypertension', 'Asthma', 'Bronchitis', 'Pneumonia',
    'Gastroenteritis', 'Malaria', 'Dengue', 'Typhoid', 'Tuberculosis',
    'Arthritis', 'Anemia', 'Common Cold', 'Fever', 'Migraine',
    'Chronic Obstructive Pulmonary Disease', 'Coronary Artery Disease',
    'Hypothyroidism', 'Urinary Tract Infection', 'Skin Infection',
    'Hepatitis B', 'Dyspepsia', 'Acid Reflux', 'Insomnia', 'Allergy'
]

TREATMENTS = [
    'Medication prescribed', 'Surgery recommended', 'Physical therapy',
    'Rest and observation', 'Antibiotics course', 'Blood test required',
    'X-ray examination', 'MRI scan', 'Follow-up in 2 weeks',
    'Diet modification', 'Lifestyle changes', 'Hospitalization required'
]


class DataGenerator:
    def __init__(self):
        self.users: List[Dict] = []
        self.hospitals: List[Dict] = []
        self.patients: List[Dict] = []
        self.hospital_assignments: List[Dict] = []
        self.patient_records: List[Dict] = []
        
        # Mappings for referential integrity
        self.user_id_counter = 1
        self.hospital_user_ids: List[int] = []
        self.patient_user_ids: List[int] = []
        self.superadmin_user_ids: List[int] = []
        self.hospital_ids: List[int] = []
        self.patient_ids: List[int] = []
        self.aadhaar_numbers: set = set()
        
        # Hash password once for efficiency
        self.password_hash = bcrypt.hashpw(
            DEFAULT_PASSWORD.encode('utf-8'),
            bcrypt.gensalt(BCRYPT_ROUNDS)
        ).decode('utf-8')

    def generate_unique_aadhaar(self) -> str:
        """Generate a unique 12-digit Aadhaar number."""
        while True:
            # Generate valid Aadhaar format (usually starts with non-zero)
            aadhaar = ''.join([str(random.randint(0, 9)) for _ in range(12)])
            if aadhaar not in self.aadhaar_numbers:
                self.aadhaar_numbers.add(aadhaar)
                return aadhaar

    def generate_indian_phone(self) -> str:
        """Generate a valid Indian phone number."""
        # Indian mobile numbers start with 6-9
        return f"+91{random.choice(['6', '7', '8', '9'])}{fake.numerify(text='#########')}"

    def generate_indian_pincode(self) -> str:
        """Generate a valid Indian 6-digit pincode."""
        return fake.numerify(text='######')

    def generate_users(self, patients_needed: int, hospitals_needed: int, superadmins_count: int = 4000):
        """Generate users with proper role distribution to support all records."""
        print(f"Generating users: {patients_needed} patients, {hospitals_needed} hospitals, {superadmins_count} superadmins...")
        
        total_users = patients_needed + hospitals_needed + superadmins_count
        print(f"Total users to generate: {total_users}")
        
        # Generate patient users (enough for 20k patients)
        for i in range(patients_needed):
            user = {
                'user_id': self.user_id_counter,
                'aadhaar_number': self.generate_unique_aadhaar(),
                'password': self.password_hash,
                'role': 'patient',
                'name': fake.name(),
                'created_at': fake.date_time_between(start_date='-5y', end_date='now').isoformat()
            }
            self.users.append(user)
            self.patient_user_ids.append(self.user_id_counter)
            self.user_id_counter += 1
            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1}/{patients_needed} patient users...")

        # Generate hospital users (enough for 20k hospitals)
        for i in range(hospitals_needed):
            user = {
                'user_id': self.user_id_counter,
                'aadhaar_number': self.generate_unique_aadhaar(),
                'password': self.password_hash,
                'role': 'hospital',
                'name': f"{fake.company()} Hospital",
                'created_at': fake.date_time_between(start_date='-5y', end_date='now').isoformat()
            }
            self.users.append(user)
            self.hospital_user_ids.append(self.user_id_counter)
            self.user_id_counter += 1
            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1}/{hospitals_needed} hospital users...")

        # Generate superadmin users (for hospital assignments)
        for i in range(superadmins_count):
            user = {
                'user_id': self.user_id_counter,
                'aadhaar_number': self.generate_unique_aadhaar(),
                'password': self.password_hash,
                'role': 'superadmin',
                'name': fake.name(),
                'created_at': fake.date_time_between(start_date='-5y', end_date='now').isoformat()
            }
            self.users.append(user)
            self.superadmin_user_ids.append(self.user_id_counter)
            self.user_id_counter += 1
            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1}/{superadmins_count} superadmin users...")

        print(f"✅ Generated {len(self.users)} users total")

    def generate_hospitals(self, count: int):
        """Generate hospitals linked to hospital users."""
        print(f"Generating {count} hospitals...")
        
        if len(self.hospital_user_ids) < count:
            raise ValueError(f"Not enough hospital users. Need {count}, have {len(self.hospital_user_ids)}")
        
        hospital_user_sample = random.sample(self.hospital_user_ids, count)
        
        for i, user_id in enumerate(hospital_user_sample):
            state = random.choice(INDIAN_STATES)
            city = random.choice(INDIAN_CITIES.get(state, [fake.city()]))
            
            hospital = {
                'hospital_id': i + 1,
                'user_id': user_id,
                'hospital_name': f"{fake.company()} Hospital",
                'address': fake.street_address(),
                'city': city,
                'state': state,
                'pincode': self.generate_indian_pincode(),
                'phone': self.generate_indian_phone(),
                'email': fake.company_email(),
                'created_at': fake.date_time_between(start_date='-5y', end_date='now').isoformat()
            }
            self.hospitals.append(hospital)
            self.hospital_ids.append(i + 1)
            
            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1} hospitals...")

        print(f"✅ Generated {len(self.hospitals)} hospitals")

    def generate_patients(self, count: int):
        """Generate patients linked to patient users."""
        print(f"Generating {count} patients...")
        
        if len(self.patient_user_ids) < count:
            raise ValueError(f"Not enough patient users. Need {count}, have {len(self.patient_user_ids)}")
        
        patient_user_sample = random.sample(self.patient_user_ids, count)
        
        for i, user_id in enumerate(patient_user_sample):
            state = random.choice(INDIAN_STATES)
            city = random.choice(INDIAN_CITIES.get(state, [fake.city()]))
            
            # Generate realistic DOB (age 1-100)
            birth_date = fake.date_between(start_date='-100y', end_date='-1y')
            
            patient = {
                'patient_id': i + 1,
                'user_id': user_id,
                'date_of_birth': birth_date.isoformat(),
                'gender': random.choice(GENDERS),
                'blood_group': random.choice(BLOOD_GROUPS),
                'phone': self.generate_indian_phone(),
                'email': fake.email(),
                'address': fake.address(),
                'emergency_contact': f"{fake.name()} - {self.generate_indian_phone()}",
                'created_at': fake.date_time_between(start_date='-5y', end_date='now').isoformat()
            }
            self.patients.append(patient)
            self.patient_ids.append(i + 1)
            
            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1} patients...")

        print(f"✅ Generated {len(self.patients)} patients")

    def generate_hospital_assignments(self, count: int):
        """Generate hospital assignments."""
        print(f"Generating {count} hospital assignments...")
        
        if len(self.hospital_ids) == 0:
            raise ValueError("No hospitals available. Generate hospitals first.")
        if len(self.superadmin_user_ids) == 0:
            raise ValueError("No superadmin users available. Generate users first.")
        
        for i in range(count):
            assignment = {
                'assignment_id': i + 1,
                'hospital_id': random.choice(self.hospital_ids),
                'assigned_by': random.choice(self.superadmin_user_ids),
                'assignment_date': fake.date_between(start_date='-3y', end_date='today').isoformat(),
                'status': random.choice(STATUS_OPTIONS),
                'notes': fake.text(max_nb_chars=100) if random.random() > 0.5 else None,
                'created_at': fake.date_time_between(start_date='-3y', end_date='now').isoformat()
            }
            self.hospital_assignments.append(assignment)
            
            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1} hospital assignments...")

        print(f"✅ Generated {len(self.hospital_assignments)} hospital assignments")

    def generate_patient_records(self, count: int):
        """Generate patient records."""
        print(f"Generating {count} patient records...")
        
        if len(self.patient_ids) == 0:
            raise ValueError("No patients available. Generate patients first.")
        if len(self.hospital_ids) == 0:
            raise ValueError("No hospitals available. Generate hospitals first.")
        
        for i in range(count):
            record = {
                'record_id': i + 1,
                'patient_id': random.choice(self.patient_ids),
                'hospital_id': random.choice(self.hospital_ids),
                'record_type': random.choice(RECORD_TYPES),
                'diagnosis': random.choice(DIAGNOSES),
                'treatment': random.choice(TREATMENTS),
                'doctor_name': f"Dr. {fake.name()}",
                'record_date': fake.date_between(start_date='-2y', end_date='today').isoformat(),
                'created_at': fake.date_time_between(start_date='-2y', end_date='now').isoformat()
            }
            self.patient_records.append(record)
            
            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1} patient records...")

        print(f"✅ Generated {len(self.patient_records)} patient records")

    def escape_sql_string(self, value) -> str:
        """Escape SQL string values."""
        if value is None:
            return 'NULL'
        if isinstance(value, bool):
            return 'TRUE' if value else 'FALSE'
        if isinstance(value, (int, float)):
            return str(value)
        # Escape single quotes and backslashes
        return "'" + str(value).replace("'", "''").replace("\\", "\\\\") + "'"

    def generate_sql_file(self, output_path: str):
        """Generate SQL INSERT statements file."""
        print(f"Generating SQL file: {output_path}...")
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("-- Indian Dummy Data for Swasthya Database\n")
            f.write(f"-- Generated on {datetime.now().isoformat()}\n")
            f.write(f"-- Total records: {RECORDS_PER_TABLE} per table\n\n")
            f.write("-- Disable foreign key checks temporarily\n")
            f.write("BEGIN;\n\n")
            
            # Insert users
            f.write("-- Insert Users\n")
            f.write("INSERT INTO users (aadhaar_number, password, role, name, created_at) VALUES\n")
            user_values = []
            for user in self.users:
                user_values.append(
                    f"({self.escape_sql_string(user['aadhaar_number'])}, "
                    f"{self.escape_sql_string(user['password'])}, "
                    f"{self.escape_sql_string(user['role'])}, "
                    f"{self.escape_sql_string(user['name'])}, "
                    f"{self.escape_sql_string(user['created_at'])})"
                )
            f.write(",\n".join(user_values))
            f.write(";\n\n")
            
            # Insert hospitals
            f.write("-- Insert Hospitals\n")
            f.write("INSERT INTO hospitals (user_id, hospital_name, address, city, state, pincode, phone, email, created_at) VALUES\n")
            hospital_values = []
            for hospital in self.hospitals:
                hospital_values.append(
                    f"({hospital['user_id']}, "
                    f"{self.escape_sql_string(hospital['hospital_name'])}, "
                    f"{self.escape_sql_string(hospital['address'])}, "
                    f"{self.escape_sql_string(hospital['city'])}, "
                    f"{self.escape_sql_string(hospital['state'])}, "
                    f"{self.escape_sql_string(hospital['pincode'])}, "
                    f"{self.escape_sql_string(hospital['phone'])}, "
                    f"{self.escape_sql_string(hospital['email'])}, "
                    f"{self.escape_sql_string(hospital['created_at'])})"
                )
            f.write(",\n".join(hospital_values))
            f.write(";\n\n")
            
            # Insert patients
            f.write("-- Insert Patients\n")
            f.write("INSERT INTO patients (user_id, date_of_birth, gender, blood_group, phone, email, address, emergency_contact, created_at) VALUES\n")
            patient_values = []
            for patient in self.patients:
                patient_values.append(
                    f"({patient['user_id']}, "
                    f"{self.escape_sql_string(patient['date_of_birth'])}, "
                    f"{self.escape_sql_string(patient['gender'])}, "
                    f"{self.escape_sql_string(patient['blood_group'])}, "
                    f"{self.escape_sql_string(patient['phone'])}, "
                    f"{self.escape_sql_string(patient['email'])}, "
                    f"{self.escape_sql_string(patient['address'])}, "
                    f"{self.escape_sql_string(patient['emergency_contact'])}, "
                    f"{self.escape_sql_string(patient['created_at'])})"
                )
            f.write(",\n".join(patient_values))
            f.write(";\n\n")
            
            # Insert hospital assignments
            f.write("-- Insert Hospital Assignments\n")
            f.write("INSERT INTO hospital_assignments (hospital_id, assigned_by, assignment_date, status, notes, created_at) VALUES\n")
            assignment_values = []
            for assignment in self.hospital_assignments:
                assignment_values.append(
                    f"({assignment['hospital_id']}, "
                    f"{assignment['assigned_by']}, "
                    f"{self.escape_sql_string(assignment['assignment_date'])}, "
                    f"{self.escape_sql_string(assignment['status'])}, "
                    f"{self.escape_sql_string(assignment['notes'])}, "
                    f"{self.escape_sql_string(assignment['created_at'])})"
                )
            f.write(",\n".join(assignment_values))
            f.write(";\n\n")
            
            # Insert patient records
            f.write("-- Insert Patient Records\n")
            f.write("INSERT INTO patient_records (patient_id, hospital_id, record_type, diagnosis, treatment, doctor_name, record_date, created_at) VALUES\n")
            record_values = []
            for record in self.patient_records:
                record_values.append(
                    f"({record['patient_id']}, "
                    f"{record['hospital_id']}, "
                    f"{self.escape_sql_string(record['record_type'])}, "
                    f"{self.escape_sql_string(record['diagnosis'])}, "
                    f"{self.escape_sql_string(record['treatment'])}, "
                    f"{self.escape_sql_string(record['doctor_name'])}, "
                    f"{self.escape_sql_string(record['record_date'])}, "
                    f"{self.escape_sql_string(record['created_at'])})"
                )
            f.write(",\n".join(record_values))
            f.write(";\n\n")
            
            f.write("COMMIT;\n")
        
        print(f"✅ SQL file generated: {output_path}")

    def generate_csv_files(self, output_dir: str):
        """Generate CSV files for each table."""
        print(f"Generating CSV files in: {output_dir}...")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Write users CSV
        if self.users:
            with open(os.path.join(output_dir, 'users.csv'), 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['user_id', 'aadhaar_number', 'password', 'role', 'name', 'created_at'])
                writer.writeheader()
                writer.writerows(self.users)
            print(f"  ✅ users.csv")
        
        # Write hospitals CSV
        if self.hospitals:
            with open(os.path.join(output_dir, 'hospitals.csv'), 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['hospital_id', 'user_id', 'hospital_name', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'created_at'])
                writer.writeheader()
                writer.writerows(self.hospitals)
            print(f"  ✅ hospitals.csv")
        
        # Write patients CSV
        if self.patients:
            with open(os.path.join(output_dir, 'patients.csv'), 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['patient_id', 'user_id', 'date_of_birth', 'gender', 'blood_group', 'phone', 'email', 'address', 'emergency_contact', 'created_at'])
                writer.writeheader()
                writer.writerows(self.patients)
            print(f"  ✅ patients.csv")
        
        # Write hospital_assignments CSV
        if self.hospital_assignments:
            with open(os.path.join(output_dir, 'hospital_assignments.csv'), 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['assignment_id', 'hospital_id', 'assigned_by', 'assignment_date', 'status', 'notes', 'created_at'])
                writer.writeheader()
                writer.writerows(self.hospital_assignments)
            print(f"  ✅ hospital_assignments.csv")
        
        # Write patient_records CSV
        if self.patient_records:
            with open(os.path.join(output_dir, 'patient_records.csv'), 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['record_id', 'patient_id', 'hospital_id', 'record_type', 'diagnosis', 'treatment', 'doctor_name', 'record_date', 'created_at'])
                writer.writeheader()
                writer.writerows(self.patient_records)
            print(f"  ✅ patient_records.csv")
        
        print(f"✅ All CSV files generated in {output_dir}")


def main():
    """Main function to generate all data."""
    print("=" * 60)
    print("Swasthya Database - Indian Dummy Data Generator")
    print(f"Generating {RECORDS_PER_TABLE} records per table")
    print("=" * 60)
    print()
    
    generator = DataGenerator()
    
    # Generate data in correct order (maintaining referential integrity)
    # Generate users: need 20k patient users, 20k hospital users, and some superadmins
    generator.generate_users(
        patients_needed=RECORDS_PER_TABLE,
        hospitals_needed=RECORDS_PER_TABLE,
        superadmins_count=4000
    )
    print()
    
    generator.generate_hospitals(RECORDS_PER_TABLE)
    print()
    
    generator.generate_patients(RECORDS_PER_TABLE)
    print()
    
    generator.generate_hospital_assignments(RECORDS_PER_TABLE)
    print()
    
    generator.generate_patient_records(RECORDS_PER_TABLE)
    print()
    
    # Generate output files
    sql_path = os.path.join('backend', 'database', 'indian_data_inserts.sql')
    csv_dir = os.path.join('backend', 'database', 'csv_data')
    
    generator.generate_sql_file(sql_path)
    print()
    
    generator.generate_csv_files(csv_dir)
    print()
    
    print("=" * 60)
    print("✅ Data generation completed successfully!")
    print(f"   - Users: {len(generator.users)}")
    print(f"   - Hospitals: {len(generator.hospitals)}")
    print(f"   - Patients: {len(generator.patients)}")
    print(f"   - Hospital Assignments: {len(generator.hospital_assignments)}")
    print(f"   - Patient Records: {len(generator.patient_records)}")
    print("=" * 60)


if __name__ == '__main__':
    main()

