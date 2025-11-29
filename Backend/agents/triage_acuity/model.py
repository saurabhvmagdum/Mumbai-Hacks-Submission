"""
Triage Acuity Classification Model
Predicts patient acuity level based on symptoms and vitals
"""

import numpy as np
import pandas as pd
from typing import Dict, Tuple, List
import logging
import joblib
import os

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

from agents.triage_acuity.config import config
from agents.triage_acuity.text_parser import symptom_parser

logger = logging.getLogger(__name__)


class TriageClassifier:
    """ML-based triage acuity classifier"""
    
    def __init__(self, model_type: str = "xgboost"):
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_names = []
        
    def train(self, X: pd.DataFrame, y: np.ndarray) -> Dict:
        """
        Train the triage classification model
        
        Args:
            X: Feature matrix
            y: Target acuity levels (1-5)
            
        Returns:
            Training metrics
        """
        logger.info(f"Training {self.model_type} triage model")
        
        # Store feature names
        self.feature_names = X.columns.tolist()
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Convert labels from 1-5 (ESI levels) to 0-4 (for XGBoost)
        y = y - 1
        
        # Initialize model
        if self.model_type == "xgboost":
            self.model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42
            )
        elif self.model_type == "random_forest":
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
        elif self.model_type == "gradient_boosting":
            self.model = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            )
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
            
        # Train model
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        # Calculate training metrics
        train_acc = self.model.score(X_scaled, y)
        
        metrics = {
            'train_accuracy': float(train_acc),
            'model_type': self.model_type,
            'n_features': X.shape[1],
            'n_samples': X.shape[0]
        }
        
        logger.info(f"Training completed. Accuracy: {train_acc:.3f}")
        return metrics
        
    def predict(self, features: Dict) -> Tuple[int, float, np.ndarray]:
        """
        Predict acuity level for a patient
        
        Args:
            features: Dictionary of patient features
            
        Returns:
            Tuple of (predicted_level, confidence, probabilities)
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before prediction")
            
        # Convert features to DataFrame
        X = pd.DataFrame([features], columns=self.feature_names)
        
        # Fill missing features with 0
        for col in self.feature_names:
            if col not in X.columns:
                X[col] = 0
                
        # Ensure column order matches training
        X = X[self.feature_names]
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        probabilities = self.model.predict_proba(X_scaled)[0]
        confidence = float(probabilities[prediction])
        
        # Convert from 0-4 (internal) to 1-5 (ESI levels)
        prediction = prediction + 1
        
        return int(prediction), confidence, probabilities
        
    def save(self, filepath: str):
        """Save model to disk"""
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'model_type': self.model_type
        }
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
        
    def load(self, filepath: str):
        """Load model from disk"""
        model_data = joblib.load(filepath)
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.model_type = model_data['model_type']
        self.is_trained = True
        logger.info(f"Model loaded from {filepath}")


class TriageEngine:
    """Complete triage engine combining NLP, ML, and rules"""
    
    def __init__(self):
        self.classifier = TriageClassifier(model_type=config.MODEL_TYPE)
        self.model_path = "./models/triage_model.pkl"
        
        # Try to load existing model
        if os.path.exists(self.model_path):
            try:
                self.classifier.load(self.model_path)
                logger.info("Loaded existing triage model")
            except Exception as e:
                logger.warning(f"Failed to load model: {e}")
                self._initialize_with_synthetic()
        else:
            self._initialize_with_synthetic()
            
    def _initialize_with_synthetic(self):
        """Initialize with synthetic training data"""
        logger.info("Initializing triage model with synthetic data")
        
        # Generate synthetic training data
        n_samples = 1000
        
        # Features based on symptom parser output
        feature_cols = [
            'has_pain', 'has_respiratory', 'has_cardiac', 'has_neurological',
            'has_gastrointestinal', 'has_trauma', 'has_fever', 'has_weakness',
            'severity_score', 'red_flags_count', 'symptom_count',
            'duration_hours', 'heart_rate', 'blood_pressure_systolic',
            'temperature', 'respiratory_rate', 'oxygen_saturation', 'age'
        ]
        
        X = pd.DataFrame(
            np.random.randn(n_samples, len(feature_cols)),
            columns=feature_cols
        )
        
        # Normalize some features to realistic ranges
        X['heart_rate'] = np.clip(X['heart_rate'] * 20 + 80, 40, 180)
        X['blood_pressure_systolic'] = np.clip(X['blood_pressure_systolic'] * 20 + 120, 80, 200)
        X['temperature'] = np.clip(X['temperature'] * 2 + 37, 35, 42)
        X['respiratory_rate'] = np.clip(X['respiratory_rate'] * 5 + 16, 8, 40)
        X['oxygen_saturation'] = np.clip(X['oxygen_saturation'] * 5 + 95, 85, 100)
        X['age'] = np.clip(X['age'] * 20 + 50, 0, 100)
        
        # Binary features
        for col in ['has_pain', 'has_respiratory', 'has_cardiac', 'has_neurological',
                    'has_gastrointestinal', 'has_trauma', 'has_fever', 'has_weakness']:
            X[col] = (X[col] > 0).astype(int)
            
        X['severity_score'] = np.random.randint(1, 4, n_samples)
        X['red_flags_count'] = np.random.randint(0, 3, n_samples)
        X['symptom_count'] = np.random.randint(1, 8, n_samples)
        X['duration_hours'] = np.random.exponential(24, n_samples)
        
        # Generate synthetic labels based on features
        y = np.ones(n_samples, dtype=int) * 3  # Default to level 3
        
        # Level 1 (Critical): red flags or critical vitals
        y[(X['red_flags_count'] > 0) | (X['oxygen_saturation'] < 90) | 
          (X['blood_pressure_systolic'] < 90)] = 1
          
        # Level 2 (Emergent): high severity or concerning vitals
        y[(X['severity_score'] == 3) & (X['has_cardiac'] == 1)] = 2
        y[(X['heart_rate'] > 130) | (X['temperature'] > 39)] = 2
        
        # Level 4-5 (Less urgent): mild symptoms
        y[(X['severity_score'] == 1) & (X['red_flags_count'] == 0)] = 4
        y[(X['symptom_count'] <= 2) & (X['severity_score'] == 1)] = 5
        
        # Train model
        self.classifier.train(X, y)
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.classifier.save(self.model_path)
        
    def triage_patient(self, patient_data: Dict) -> Dict:
        """
        Complete triage assessment for a patient
        
        Args:
            patient_data: Dictionary with symptoms, vitals, etc.
            
        Returns:
            Triage decision with acuity level and reasoning
        """
        logger.info(f"Triaging patient: {patient_data.get('patient_id', 'unknown')}")
        
        # Step 1: Parse symptoms from text
        symptoms_text = patient_data.get('symptoms', '')
        parsed_symptoms = symptom_parser.parse(symptoms_text)
        
        # Step 2: Check for red flags in vitals
        vitals = patient_data.get('vitals', {})
        vital_red_flags = self._check_vital_red_flags(vitals)
        
        # Step 3: Prepare features for ML model
        symptom_features = symptom_parser.generate_features(parsed_symptoms)
        vital_features = self._extract_vital_features(vitals)
        demographic_features = {
            'age': patient_data.get('age', 50)
        }
        
        all_features = {**symptom_features, **vital_features, **demographic_features}
        
        # Step 4: Get ML prediction
        predicted_level, confidence, probabilities = self.classifier.predict(all_features)
        
        # Step 5: Apply rule overrides
        final_level, override_reason = self._apply_rule_overrides(
            predicted_level,
            parsed_symptoms['red_flags'],
            vital_red_flags
        )
        
        # Prepare response
        result = {
            'patient_id': patient_data.get('patient_id', ''),
            'acuity_level': final_level,
            'acuity_label': config.ACUITY_LEVELS[final_level],
            'confidence': confidence,
            'ml_predicted_level': predicted_level,
            'override_applied': final_level != predicted_level,
            'override_reason': override_reason,
            'risk_factors': self._identify_risk_factors(all_features),
            'red_flags': parsed_symptoms['red_flags'] + vital_red_flags,
            'recommended_action': self._get_recommended_action(final_level),
            'model_version': config.MODEL_VERSION
        }
        
        logger.info(f"Triage completed: Level {final_level} ({result['acuity_label']})")
        return result
        
    def _check_vital_red_flags(self, vitals: Dict) -> List[str]:
        """Check vitals for critical values"""
        red_flags = []
        
        for vital, value in vitals.items():
            if vital in config.VITAL_THRESHOLDS and value is not None:
                thresholds = config.VITAL_THRESHOLDS[vital]
                
                if 'critical_low' in thresholds and value < thresholds['critical_low']:
                    red_flags.append(f"Critical low {vital}: {value}")
                if 'critical_high' in thresholds and value > thresholds['critical_high']:
                    red_flags.append(f"Critical high {vital}: {value}")
                    
        return red_flags
        
    def _extract_vital_features(self, vitals: Dict) -> Dict:
        """Extract features from vital signs"""
        features = {
            'heart_rate': vitals.get('heart_rate', 75),
            'blood_pressure_systolic': vitals.get('blood_pressure_systolic', 120),
            'temperature': vitals.get('temperature', 37.0),
            'respiratory_rate': vitals.get('respiratory_rate', 16),
            'oxygen_saturation': vitals.get('oxygen_saturation', 98)
        }
        return features
        
    def _apply_rule_overrides(
        self,
        ml_prediction: int,
        symptom_red_flags: List[str],
        vital_red_flags: List[str]
    ) -> Tuple[int, str]:
        """Apply rule-based overrides to ML prediction"""
        
        # If any red flags, escalate to level 1 or 2
        all_red_flags = symptom_red_flags + vital_red_flags
        
        if all_red_flags:
            if ml_prediction > 2:
                return 1, f"Red flags detected: {', '.join(all_red_flags)}"
                
        return ml_prediction, "No override applied"
        
    def _identify_risk_factors(self, features: Dict) -> List[str]:
        """Identify risk factors from features"""
        risk_factors = []
        
        if features.get('has_cardiac'):
            risk_factors.append("Cardiac symptoms")
        if features.get('has_respiratory'):
            risk_factors.append("Respiratory symptoms")
        if features.get('severity_score', 0) >= 3:
            risk_factors.append("High severity")
        if features.get('age', 0) > 65:
            risk_factors.append("Advanced age")
            
        return risk_factors
        
    def _get_recommended_action(self, acuity_level: int) -> str:
        """Get recommended action based on acuity level"""
        actions = {
            1: "IMMEDIATE attention required. Call trauma team.",
            2: "See within 10 minutes. Alert senior physician.",
            3: "See within 30 minutes. Standard ER protocol.",
            4: "See within 1 hour. Monitor in waiting area.",
            5: "See within 2 hours. Consider urgent care referral."
        }
        return actions.get(acuity_level, "Assess and assign appropriate priority")


# Global engine instance
triage_engine = TriageEngine()

