"""
Discharge Planning Model
Hybrid ML + Rules approach for identifying discharge-ready patients
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import logging
import joblib
import os
from datetime import datetime, timedelta

from sklearn.ensemble import GradientBoostingClassifier
import xgboost as xgb

from agents.discharge_planning.config import config

logger = logging.getLogger(__name__)


class DischargeRulesEngine:
    """Rule-based discharge readiness evaluation"""
    
    def __init__(self):
        self.criteria = config.DISCHARGE_CRITERIA
        
    def evaluate(self, patient_data: Dict) -> Dict:
        """
        Evaluate patient against discharge criteria
        
        Args:
            patient_data: Patient information including vitals, days in hospital, etc.
            
        Returns:
            Dictionary with criteria evaluation results
        """
        results = {}
        
        # Days since admission
        if 'admission_date' in patient_data:
            admission_date = datetime.fromisoformat(patient_data['admission_date'])
            days_admitted = (datetime.now() - admission_date).days
            results['sufficient_days'] = days_admitted >= self.criteria['min_days_since_admission']
        else:
            results['sufficient_days'] = False
            
        # Temperature check
        vitals = patient_data.get('vitals', {})
        temperature = vitals.get('temperature')
        if temperature is not None:
            results['no_fever'] = temperature <= self.criteria['max_temperature']
        else:
            results['no_fever'] = True  # Assume OK if not measured recently
            
        # Oxygen saturation
        oxygen_sat = vitals.get('oxygen_saturation')
        if oxygen_sat is not None:
            results['adequate_oxygen'] = oxygen_sat >= self.criteria['min_oxygen_saturation']
        else:
            results['adequate_oxygen'] = True
            
        # Pain management
        pain_score = patient_data.get('pain_score')
        if pain_score is not None:
            results['pain_controlled'] = pain_score <= self.criteria['pain_score_max']
        else:
            results['pain_controlled'] = True
            
        # Mobility
        mobility_score = patient_data.get('mobility_score')
        if mobility_score is not None:
            results['adequate_mobility'] = mobility_score >= self.criteria['mobility_min_score']
        else:
            results['adequate_mobility'] = True
            
        # Check for pending procedures
        pending_procedures = patient_data.get('procedures_completed', [])
        required_procedures = patient_data.get('procedures_required', [])
        results['all_procedures_complete'] = all(
            proc in pending_procedures for proc in required_procedures
        ) if required_procedures else True
        
        # Social factors
        has_home_support = patient_data.get('has_home_support', True)
        results['home_support_available'] = has_home_support
        
        # Overall readiness based on rules
        all_criteria_met = all(results.values())
        
        return {
            'criteria_met': results,
            'all_criteria_met': all_criteria_met,
            'failed_criteria': [k for k, v in results.items() if not v]
        }


class DischargePredictionModel:
    """ML model for discharge readiness prediction"""
    
    def __init__(self, model_type: str = "xgboost"):
        self.model_type = model_type
        self.model = None
        self.is_trained = False
        self.feature_names = []
        
    def train(self, X: pd.DataFrame, y: np.ndarray) -> Dict:
        """
        Train discharge prediction model
        
        Args:
            X: Feature matrix
            y: Target (1 = ready for discharge, 0 = not ready)
            
        Returns:
            Training metrics
        """
        logger.info(f"Training {self.model_type} discharge model")
        
        self.feature_names = X.columns.tolist()
        
        # Initialize model
        if self.model_type == "xgboost":
            self.model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            )
        else:
            self.model = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            )
            
        # Train
        self.model.fit(X, y)
        self.is_trained = True
        
        # Metrics
        train_acc = self.model.score(X, y)
        
        metrics = {
            'train_accuracy': float(train_acc),
            'n_features': X.shape[1],
            'n_samples': X.shape[0]
        }
        
        logger.info(f"Training completed. Accuracy: {train_acc:.3f}")
        return metrics
        
    def predict(self, features: Dict) -> Tuple[float, float]:
        """
        Predict discharge readiness
        
        Args:
            features: Patient feature dictionary
            
        Returns:
            Tuple of (readiness_score, confidence)
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        # Ensure all features are numeric and fill missing values
        processed_features = {}
        for col in self.feature_names:
            if col in features:
                value = features[col]
                # Convert to numeric, handling None, strings, etc.
                try:
                    processed_features[col] = pd.to_numeric(value, errors='coerce')
                    if pd.isna(processed_features[col]):
                        processed_features[col] = 0
                except (ValueError, TypeError):
                    processed_features[col] = 0
            else:
                processed_features[col] = 0
        
        # Convert to DataFrame with proper types
        X = pd.DataFrame([processed_features], columns=self.feature_names)
        
        # Ensure all columns are numeric
        for col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)
        
        # Predict probability
        prob = self.model.predict_proba(X)[0][1]  # Probability of class 1 (ready)
        
        return float(prob), float(max(prob, 1-prob))
        
    def save(self, filepath: str):
        """Save model"""
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names,
            'model_type': self.model_type
        }
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
        
    def load(self, filepath: str):
        """Load model"""
        model_data = joblib.load(filepath)
        self.model = model_data['model']
        self.feature_names = model_data['feature_names']
        self.model_type = model_data['model_type']
        self.is_trained = True
        logger.info(f"Model loaded from {filepath}")


class DischargePlanningEngine:
    """Complete discharge planning engine combining ML and rules"""
    
    def __init__(self):
        self.rules_engine = DischargeRulesEngine()
        self.ml_model = DischargePredictionModel(model_type=config.MODEL_TYPE)
        self.model_path = "./models/discharge_model.pkl"
        
        # Try to load existing model
        if os.path.exists(self.model_path):
            try:
                self.ml_model.load(self.model_path)
                logger.info("Loaded existing discharge planning model")
            except Exception as e:
                logger.warning(f"Failed to load model: {e}")
                self._initialize_with_synthetic()
        else:
            self._initialize_with_synthetic()
            
    def _initialize_with_synthetic(self):
        """Initialize with synthetic training data"""
        logger.info("Initializing discharge model with synthetic data")
        
        n_samples = 1000
        
        feature_cols = [
            'days_admitted', 'age', 'temperature', 'oxygen_saturation',
            'heart_rate', 'pain_score', 'mobility_score',
            'procedures_completed_count', 'has_home_support',
            'diagnosis_severity', 'comorbidities_count'
        ]
        
        X = pd.DataFrame(
            np.random.randn(n_samples, len(feature_cols)),
            columns=feature_cols
        )
        
        # Normalize to realistic ranges
        X['days_admitted'] = np.clip(X['days_admitted'] * 3 + 5, 0, 30)
        X['age'] = np.clip(X['age'] * 20 + 60, 18, 95)
        X['temperature'] = np.clip(X['temperature'] * 1 + 37, 35, 40)
        X['oxygen_saturation'] = np.clip(X['oxygen_saturation'] * 5 + 95, 85, 100)
        X['heart_rate'] = np.clip(X['heart_rate'] * 15 + 75, 50, 130)
        X['pain_score'] = np.clip(X['pain_score'] * 2 + 3, 0, 10)
        X['mobility_score'] = np.clip(X['mobility_score'] + 3, 1, 5)
        X['procedures_completed_count'] = np.clip(X['procedures_completed_count'] + 3, 0, 10)
        X['has_home_support'] = (X['has_home_support'] > 0).astype(int)
        X['diagnosis_severity'] = np.clip(X['diagnosis_severity'] + 3, 1, 5)
        X['comorbidities_count'] = np.clip(X['comorbidities_count'] + 1, 0, 5)
        
        # Generate labels based on features
        y = np.zeros(n_samples, dtype=int)
        
        # Patients ready for discharge: sufficient days, stable vitals, good mobility
        ready_mask = (
            (X['days_admitted'] >= 3) &
            (X['temperature'] <= 38) &
            (X['oxygen_saturation'] >= 92) &
            (X['pain_score'] <= 4) &
            (X['mobility_score'] >= 3) &
            (X['has_home_support'] == 1)
        )
        y[ready_mask] = 1
        
        # Train model
        self.ml_model.train(X, y)
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.ml_model.save(self.model_path)
        
    def analyze_patient(self, patient_data: Dict) -> Dict:
        """
        Analyze patient for discharge readiness
        
        Args:
            patient_data: Patient information
            
        Returns:
            Discharge analysis with score and recommendations
        """
        logger.info(f"Analyzing discharge readiness for patient {patient_data.get('patient_id')}")
        
        # Step 1: Rule-based evaluation
        rules_result = self.rules_engine.evaluate(patient_data)
        
        # Step 2: Extract features for ML model
        features = self._extract_features(patient_data)
        
        # Step 3: ML prediction
        ml_score, confidence = self.ml_model.predict(features)
        
        # Step 4: Combine ML and rules
        final_score, decision = self._combine_ml_and_rules(
            ml_score, 
            rules_result['all_criteria_met']
        )
        
        # Step 5: Estimate discharge date
        estimated_date = self._estimate_discharge_date(
            patient_data,
            final_score,
            rules_result['failed_criteria']
        )
        
        # Step 6: Generate recommendations
        recommendations = self._generate_recommendations(
            patient_data,
            rules_result,
            final_score
        )
        
        result = {
            'patient_id': patient_data.get('patient_id', ''),
            'discharge_readiness_score': final_score,
            'ml_score': ml_score,
            'ml_confidence': confidence,
            'rules_passed': rules_result['all_criteria_met'],
            'criteria_met': rules_result['criteria_met'],
            'failed_criteria': rules_result['failed_criteria'],
            'estimated_discharge_date': estimated_date,
            'recommendations': recommendations,
            'model_version': config.MODEL_VERSION
        }
        
        logger.info(f"Discharge analysis completed: Score={final_score:.2f}")
        return result
        
    def _extract_features(self, patient_data: Dict) -> Dict:
        """Extract features from patient data for ML model"""
        vitals = patient_data.get('vitals', {})
        
        # Calculate days admitted
        days_admitted = 0
        if 'admission_date' in patient_data:
            try:
                admission_date = datetime.fromisoformat(patient_data['admission_date'].replace('Z', '+00:00'))
                days_admitted = (datetime.now() - admission_date.replace(tzinfo=None)).days
            except (ValueError, AttributeError):
                days_admitted = 0
        
        # Helper function to safely convert to float
        def to_float(value, default=0.0):
            try:
                return float(value) if value is not None else default
            except (ValueError, TypeError):
                return default
        
        features = {
            'days_admitted': float(days_admitted),
            'age': to_float(patient_data.get('age'), 60),
            'temperature': to_float(vitals.get('temperature'), 37.0),
            'oxygen_saturation': to_float(vitals.get('oxygen_saturation'), 96),
            'heart_rate': to_float(vitals.get('heart_rate'), 75),
            'pain_score': to_float(patient_data.get('pain_score'), 2),
            'mobility_score': to_float(patient_data.get('mobility_score'), 4),
            'procedures_completed_count': float(len(patient_data.get('procedures_completed', []))),
            'has_home_support': 1 if patient_data.get('has_home_support', True) else 0,
            'diagnosis_severity': to_float(patient_data.get('diagnosis_severity'), 2),
            'comorbidities_count': float(len(patient_data.get('comorbidities', [])))
        }
        
        return features
        
    def _combine_ml_and_rules(
        self,
        ml_score: float,
        rules_passed: bool
    ) -> Tuple[float, str]:
        """Combine ML score with rule-based checks"""
        
        # If rules not passed, cap the score
        if not rules_passed:
            final_score = min(ml_score, 0.5)
            decision = "not_ready_rules"
        elif ml_score >= 0.7 and rules_passed:
            final_score = ml_score
            decision = "ready"
        else:
            final_score = ml_score * 0.8 if not rules_passed else ml_score
            decision = "borderline"
            
        return final_score, decision
        
    def _estimate_discharge_date(
        self,
        patient_data: Dict,
        readiness_score: float,
        failed_criteria: List[str]
    ) -> str:
        """Estimate discharge date based on readiness"""
        
        if readiness_score >= 0.8:
            # Ready today or tomorrow
            days_until = 0 if readiness_score >= 0.9 else 1
        elif readiness_score >= 0.6:
            # Ready in 2-3 days
            days_until = 2
        else:
            # Based on failed criteria, estimate longer
            days_until = min(len(failed_criteria) + 2, 7)
            
        estimated_date = datetime.now() + timedelta(days=days_until)
        return estimated_date.date().isoformat()
        
    def _generate_recommendations(
        self,
        patient_data: Dict,
        rules_result: Dict,
        readiness_score: float
    ) -> List[str]:
        """Generate discharge recommendations"""
        recommendations = []
        
        if readiness_score >= 0.8:
            recommendations.append("Patient appears ready for discharge")
            recommendations.append("Complete discharge paperwork")
            recommendations.append("Arrange follow-up appointments")
        else:
            # Address failed criteria
            failed = rules_result['failed_criteria']
            
            if 'no_fever' in failed:
                recommendations.append("Monitor temperature - continue antibiotics if prescribed")
            if 'adequate_oxygen' in failed:
                recommendations.append("Oxygen support needed - reassess in 24 hours")
            if 'pain_controlled' in failed:
                recommendations.append("Adjust pain management plan")
            if 'adequate_mobility' in failed:
                recommendations.append("Physical therapy consultation recommended")
            if 'home_support_available' in failed:
                recommendations.append("Arrange home health services before discharge")
            if 'all_procedures_complete' in failed:
                recommendations.append("Complete pending procedures/tests")
                
        return recommendations


# Global engine instance
discharge_engine = DischargePlanningEngine()

