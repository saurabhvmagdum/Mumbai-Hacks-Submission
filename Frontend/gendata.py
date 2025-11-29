import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ------------------------------------------
# CONFIGURATION
# ------------------------------------------
TOTAL_ROWS = 50000
MULTI_PATIENT_PERCENT = 0.70  # 10% of patients will have multiple records

# ------------------------------------------
# Helper Functions
# ------------------------------------------

def random_aadhaar():
    """Generate a random 12-digit patient ID."""
    return ''.join([str(random.randint(0, 9)) for _ in range(12)])

def random_date(start_date="2020-01-01", end_date="2024-12-31"):
    """Generate a random date between two dates."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    delta = end - start
    random_days = random.randrange(delta.days)
    return (start + timedelta(days=random_days)).date()

def choice(options):
    return random.choice(options)

# ------------------------------------------
# Reference Lists
# ------------------------------------------
diseases = [
    "Flu", "Covid", "Malaria", "Dengue", "Typhoid",
    "Asthma", "Pneumonia", "Bronchitis"
]

yes_no = ["Yes", "No"]
gender_list = ["Male", "Female"]
bp_list = ["Normal", "High"]
cholesterol_list = ["Normal", "High"]
outcome_list = ["Positive", "Negative"]

# ------------------------------------------
# STEP 1: Create unique patient IDs
# ------------------------------------------
unique_patients = int(TOTAL_ROWS * (1 - MULTI_PATIENT_PERCENT))
multi_patients = int(TOTAL_ROWS * MULTI_PATIENT_PERCENT)

# Actual unique IDs needed
unique_ids_count = unique_patients + int(multi_patients / 3)

patient_ids = [random_aadhaar() for _ in range(unique_ids_count)]

# ------------------------------------------
# STEP 2: Select IDs that will have multiple records
# ------------------------------------------
multi_patient_ids = random.sample(patient_ids, int(unique_ids_count * MULTI_PATIENT_PERCENT))

records = []

# ------------------------------------------
# STEP 3: Generate records
# ------------------------------------------
for pid in patient_ids:
    # 2–4 records for multi patients, else 1 record
    repeat = random.randint(2, 4) if pid in multi_patient_ids else 1

    for _ in range(repeat):
        record = {
            "patient_id": pid,
            "Date": random_date(),
            "Disease": choice(diseases),
            "Fever": choice(yes_no),
            "Cough": choice(yes_no),
            "Fatigue": choice(yes_no),
            "Difficulty Breathing": choice(yes_no),
            "Age": random.randint(1, 100),
            "Gender": choice(gender_list),
            "Blood Pressure": choice(bp_list),
            "Cholesterol Level": choice(cholesterol_list),
            "Outcome Variable": choice(outcome_list)
        }
        records.append(record)

# Convert to DataFrame
df = pd.DataFrame(records).head(TOTAL_ROWS)

# Shuffle for randomness
df = df.sample(frac=1).reset_index(drop=True)

# Save output
df.to_csv("patient_dataset.csv", index=False)

print("Dataset Created Successfully!")
print("Total Rows:", df.shape[0])
print(df.head(10))
 
# import random
# import pandas as pd
# import numpy as np

# # -----------------------------
# # CONFIGURATION
# # -----------------------------
# TOTAL_ROWS = 50000
# MULTI_PATIENT_PERCENT = 0.70  # 10% patients with multiple disease records

# # -----------------------------
# # Helper Functions
# # -----------------------------

# def random_aadhaar():
#     """Generate a 12-digit numeric patient ID."""
#     return ''.join([str(random.randint(0, 9)) for _ in range(12)])

# def random_choice(options):
#     return random.choice(options)

# diseases = [
#     "Flu", "Covid", "Malaria", "Dengue", "Typhoid", 
#     "Asthma", "Pneumonia", "Bronchitis"
# ]

# yes_no = ["Yes", "No"]
# gender_list = ["Male", "Female"]
# bp_list = ["Normal", "High"]
# cholesterol_list = ["Normal", "High"]
# outcome_list = ["Positive", "Negative"]

# # -----------------------------
# # STEP 1: Generate unique patients
# # -----------------------------
# unique_patients = int(TOTAL_ROWS * (1 - MULTI_PATIENT_PERCENT))
# multi_patients = int(TOTAL_ROWS * MULTI_PATIENT_PERCENT)

# # Number of actual unique patient IDs
# unique_ids_count = unique_patients + int(multi_patients / 3)

# # Create unique patient IDs
# patient_ids = [random_aadhaar() for _ in range(unique_ids_count)]

# # -----------------------------
# # STEP 2: Assign multiple records to 10% patients
# # -----------------------------
# multi_patient_ids = random.sample(patient_ids, int(unique_ids_count * MULTI_PATIENT_PERCENT))

# records = []

# for pid in patient_ids:
#     # Patients with multiple records (2–4 records)
#     repeat_times = random.randint(2, 4) if pid in multi_patient_ids else 1

#     for _ in range(repeat_times):
#         record = {
#             "patient_id": pid,
#             "Disease": random_choice(diseases),
#             "Fever": random_choice(yes_no),
#             "Cough": random_choice(yes_no),
#             "Fatigue": random_choice(yes_no),
#             "Difficulty Breathing": random_choice(yes_no),
#             "Age": random.randint(1, 100),
#             "Gender": random_choice(gender_list),
#             "Blood Pressure": random_choice(bp_list),
#             "Cholesterol Level": random_choice(cholesterol_list),
#             "Outcome Variable": random_choice(outcome_list)
#         }
#         records.append(record)

# # Trim or extend to exactly 50,000 rows
# df = pd.DataFrame(records).head(TOTAL_ROWS)

# # -----------------------------
# # STEP 3: Shuffle rows
# # -----------------------------
# df = df.sample(frac=1).reset_index(drop=True)

# # -----------------------------
# # STEP 4: Save file
# # -----------------------------
# df.to_csv("generated_patient_dataset.csv", index=False)

# print("Dataset generated with rows:", df.shape[0])
# print(df.head(10))
