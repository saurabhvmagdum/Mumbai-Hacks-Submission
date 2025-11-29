"""
NLP Text Parser for Symptom Extraction from Patient Complaints
Extracts key symptoms and medical indicators from free-text input
"""

import re
from typing import List, Dict, Set
import logging

logger = logging.getLogger(__name__)


class SymptomParser:
    """Extract symptoms from patient complaints using NLP"""
    
    def __init__(self):
        # Medical keywords and their categories
        self.symptom_keywords = {
            'pain': ['pain', 'ache', 'hurt', 'sore', 'discomfort'],
            'respiratory': ['breathing', 'breath', 'cough', 'wheeze', 'dyspnea', 'shortness of breath'],
            'cardiac': ['chest pain', 'palpitations', 'heart', 'cardiac'],
            'neurological': ['headache', 'dizziness', 'dizzy', 'confused', 'seizure', 'stroke', 'numbness'],
            'gastrointestinal': ['nausea', 'vomiting', 'diarrhea', 'abdominal pain', 'stomach'],
            'trauma': ['injury', 'fall', 'accident', 'bleeding', 'fracture', 'cut', 'wound'],
            'fever': ['fever', 'chills', 'hot', 'temperature'],
            'weakness': ['weak', 'fatigue', 'tired', 'exhausted']
        }
        
        self.severity_modifiers = {
            'severe': ['severe', 'extreme', 'terrible', 'worst', 'unbearable', 'intense'],
            'moderate': ['moderate', 'significant', 'considerable'],
            'mild': ['mild', 'slight', 'minor']
        }
        
        self.duration_patterns = [
            r'(\d+)\s*(hour|hr|hours|hrs)',
            r'(\d+)\s*(day|days)',
            r'(\d+)\s*(week|weeks)',
            r'(\d+)\s*(minute|minutes|min|mins)'
        ]
        
    def parse(self, text: str) -> Dict:
        """
        Parse symptom text and extract structured information
        
        Args:
            text: Free-text patient complaint
            
        Returns:
            Dictionary with extracted symptoms and metadata
        """
        if not text:
            return {
                'symptoms': [],
                'severity': 'unknown',
                'red_flags': [],
                'duration': None
            }
            
        text_lower = text.lower()
        
        # Extract symptoms by category
        symptoms = self._extract_symptoms(text_lower)
        
        # Determine severity
        severity = self._extract_severity(text_lower)
        
        # Check for red flags
        red_flags = self._check_red_flags(text_lower)
        
        # Extract duration
        duration = self._extract_duration(text_lower)
        
        result = {
            'symptoms': symptoms,
            'severity': severity,
            'red_flags': red_flags,
            'duration': duration,
            'original_text': text
        }
        
        logger.info(f"Parsed symptoms: {len(symptoms)} found, severity: {severity}")
        return result
        
    def _extract_symptoms(self, text: str) -> List[Dict]:
        """Extract symptom categories and specific symptoms"""
        found_symptoms = []
        
        for category, keywords in self.symptom_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    # Check for negation
                    negation_window = 10
                    idx = text.find(keyword)
                    before_text = text[max(0, idx-negation_window):idx]
                    
                    # Common negation words
                    if any(neg in before_text for neg in ['no ', 'not ', 'without ', 'denies ']):
                        continue
                        
                    found_symptoms.append({
                        'category': category,
                        'symptom': keyword,
                        'present': True
                    })
                    break  # Only count once per category
                    
        return found_symptoms
        
    def _extract_severity(self, text: str) -> str:
        """Determine severity from modifying words"""
        for severity, modifiers in self.severity_modifiers.items():
            for modifier in modifiers:
                if modifier in text:
                    return severity
        return 'moderate'  # default
        
    def _check_red_flags(self, text: str) -> List[str]:
        """Check for critical red flag symptoms"""
        from config import config
        
        red_flags = []
        for flag in config.RED_FLAG_KEYWORDS:
            if flag in text:
                red_flags.append(flag)
                
        return red_flags
        
    def _extract_duration(self, text: str) -> Dict:
        """Extract symptom duration"""
        for pattern in self.duration_patterns:
            match = re.search(pattern, text)
            if match:
                value = int(match.group(1))
                unit = match.group(2)
                return {
                    'value': value,
                    'unit': unit,
                    'text': match.group(0)
                }
        return None
        
    def generate_features(self, parsed_data: Dict) -> Dict:
        """
        Generate feature vector for ML model from parsed symptoms
        
        Args:
            parsed_data: Output from parse() method
            
        Returns:
            Feature dictionary for ML model
        """
        features = {}
        
        # Binary features for symptom categories
        for category in self.symptom_keywords.keys():
            features[f'has_{category}'] = any(
                s['category'] == category for s in parsed_data['symptoms']
            )
            
        # Severity encoding
        severity_map = {'mild': 1, 'moderate': 2, 'severe': 3, 'unknown': 2}
        features['severity_score'] = severity_map.get(parsed_data['severity'], 2)
        
        # Red flags count
        features['red_flags_count'] = len(parsed_data['red_flags'])
        features['has_red_flags'] = len(parsed_data['red_flags']) > 0
        
        # Duration features (convert to hours)
        if parsed_data['duration']:
            duration_hours = self._convert_to_hours(
                parsed_data['duration']['value'],
                parsed_data['duration']['unit']
            )
            features['duration_hours'] = duration_hours
        else:
            features['duration_hours'] = 0
            
        # Total symptoms count
        features['symptom_count'] = len(parsed_data['symptoms'])
        
        return features
        
    def _convert_to_hours(self, value: int, unit: str) -> float:
        """Convert duration to hours"""
        unit_lower = unit.lower()
        
        if 'minute' in unit_lower or 'min' in unit_lower:
            return value / 60.0
        elif 'hour' in unit_lower or 'hr' in unit_lower:
            return float(value)
        elif 'day' in unit_lower:
            return value * 24.0
        elif 'week' in unit_lower:
            return value * 24.0 * 7.0
        else:
            return float(value)


# Global parser instance
symptom_parser = SymptomParser()

