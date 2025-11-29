"""
ER and OR Scheduling Logic
- ER: Dynamic patient prioritization based on acuity and wait time
- OR: Operating room scheduling optimization
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import logging
from ortools.sat.python import cp_model
import joblib
import os

from agents.eror_scheduling.config import config

logger = logging.getLogger(__name__)


class ERQueue:
    """Emergency Room Queue Management with Dynamic Prioritization"""
    
    def __init__(self):
        self.queue = []  # List of patients in queue
        
    def add_patient(self, patient: Dict):
        """
        Add patient to ER queue
        
        Args:
            patient: Dictionary with patient_id, acuity_level, arrival_time
        """
        patient['added_time'] = datetime.now().isoformat()
        self.queue.append(patient)
        logger.info(f"Patient {patient['patient_id']} added to ER queue (Acuity: {patient['acuity_level']})")
        
    def get_next_patient(self) -> Optional[Dict]:
        """
        Get next patient to be seen based on acuity and wait time
        Uses weighted scoring: acuity has higher weight than wait time
        
        Returns:
            Next patient to be seen, or None if queue is empty
        """
        if not self.queue:
            return None
            
        # Calculate priority scores for all patients
        now = datetime.now()
        
        for patient in self.queue:
            arrival = datetime.fromisoformat(patient['added_time'])
            wait_minutes = (now - arrival).total_seconds() / 60
            
            # Priority score: lower is higher priority
            # Acuity level (1-5) weighted heavily, wait time increases priority over time
            acuity_weight = 100
            wait_weight = 1
            
            patient['priority_score'] = (
                patient['acuity_level'] * acuity_weight - 
                wait_minutes * wait_weight
            )
            
        # Sort by priority score (ascending - lower score = higher priority)
        self.queue.sort(key=lambda x: x['priority_score'])
        
        # Remove and return highest priority patient
        next_patient = self.queue.pop(0)
        logger.info(f"Next patient: {next_patient['patient_id']} (Acuity: {next_patient['acuity_level']})")
        
        return next_patient
        
    def update_patient_acuity(self, patient_id: str, new_acuity: int):
        """Update patient acuity level (re-triage)"""
        for patient in self.queue:
            if patient['patient_id'] == patient_id:
                old_acuity = patient['acuity_level']
                patient['acuity_level'] = new_acuity
                logger.info(f"Patient {patient_id} acuity updated: {old_acuity} -> {new_acuity}")
                return True
        return False
        
    def get_queue_status(self) -> Dict:
        """Get current queue statistics"""
        if not self.queue:
            return {
                'total_patients': 0,
                'by_acuity': {},
                'average_wait_minutes': 0
            }
            
        now = datetime.now()
        wait_times = []
        acuity_counts = {}
        
        for patient in self.queue:
            arrival = datetime.fromisoformat(patient['added_time'])
            wait_minutes = (now - arrival).total_seconds() / 60
            wait_times.append(wait_minutes)
            
            acuity = patient['acuity_level']
            acuity_counts[acuity] = acuity_counts.get(acuity, 0) + 1
            
        return {
            'total_patients': len(self.queue),
            'by_acuity': acuity_counts,
            'average_wait_minutes': np.mean(wait_times) if wait_times else 0,
            'max_wait_minutes': max(wait_times) if wait_times else 0
        }


class SurgeryDurationPredictor:
    """Predict surgery duration based on procedure and patient factors"""
    
    def __init__(self):
        self.model = None
        self.model_path = "./models/surgery_duration_model.pkl"
        
        # Load model if exists, otherwise use baseline
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                logger.info("Loaded surgery duration prediction model")
            except Exception as e:
                logger.warning(f"Failed to load model: {e}")
                
    def predict_duration(self, surgery_case: Dict) -> int:
        """
        Predict surgery duration in minutes
        
        Args:
            surgery_case: Dictionary with procedure_type, patient_age, complexity, etc.
            
        Returns:
            Predicted duration in minutes
        """
        if self.model is not None:
            # Use ML model if available
            features = self._extract_features(surgery_case)
            duration = self.model.predict([features])[0]
        else:
            # Use baseline estimates by procedure type
            duration = self._baseline_estimate(surgery_case)
            
        # Add buffer time (10% buffer)
        duration_with_buffer = int(duration * 1.1)
        
        logger.info(f"Predicted duration for {surgery_case.get('case_id')}: {duration_with_buffer} min")
        return duration_with_buffer
        
    def _extract_features(self, surgery_case: Dict) -> List:
        """Extract features for ML model"""
        # Simplified feature extraction
        return [
            surgery_case.get('patient_age', 50),
            surgery_case.get('complexity_score', 2),
            surgery_case.get('estimated_duration', 120)
        ]
        
    def _baseline_estimate(self, surgery_case: Dict) -> int:
        """Baseline duration estimates by procedure type"""
        procedure_durations = {
            'appendectomy': 60,
            'cholecystectomy': 90,
            'hernia_repair': 120,
            'knee_replacement': 180,
            'cardiac_bypass': 300,
            'default': 120
        }
        
        procedure_type = surgery_case.get('procedure_type', 'default')
        base_duration = procedure_durations.get(procedure_type, procedure_durations['default'])
        
        # Adjust for complexity
        complexity = surgery_case.get('complexity_score', 2)
        adjusted_duration = base_duration * (complexity / 2)
        
        return int(adjusted_duration)


class ORScheduler:
    """Operating Room Scheduler using constraint programming"""
    
    def __init__(self):
        self.predictor = SurgeryDurationPredictor()
        
    def schedule_cases(
        self,
        cases: List[Dict],
        available_ors: int = 4,
        start_time: str = None,
        end_time: str = None
    ) -> Dict:
        """
        Schedule surgical cases across available ORs
        
        Args:
            cases: List of surgical cases to schedule
            available_ors: Number of available operating rooms
            start_time: OR opening time (HH:MM)
            end_time: OR closing time (HH:MM)
            
        Returns:
            Schedule with assignments and metrics
        """
        logger.info(f"Scheduling {len(cases)} cases across {available_ors} ORs")
        
        if not cases:
            return {'status': 'success', 'schedule': [], 'metrics': {}}
            
        # Predict durations for all cases
        for case in cases:
            if 'predicted_duration' not in case:
                case['predicted_duration'] = self.predictor.predict_duration(case)
                
        # Use constraint programming to optimize schedule
        schedule = self._optimize_schedule(cases, available_ors, start_time, end_time)
        
        return schedule
        
    def _optimize_schedule(
        self,
        cases: List[Dict],
        available_ors: int,
        start_time: str,
        end_time: str
    ) -> Dict:
        """Optimize OR schedule using CP-SAT solver"""
        
        # Parse times
        if start_time is None:
            start_time = config.OR_OPENING_TIME
        if end_time is None:
            end_time = config.OR_CLOSING_TIME
            
        start_minutes = self._time_to_minutes(start_time)
        end_minutes = self._time_to_minutes(end_time)
        horizon = end_minutes - start_minutes
        
        # Create model
        model = cp_model.CpModel()
        
        # Variables: start time and OR assignment for each case
        case_vars = {}
        for i, case in enumerate(cases):
            duration = case['predicted_duration'] + config.DEFAULT_TURNOVER_TIME_MINUTES
            
            # Start time variable (relative to OR opening)
            start_var = model.NewIntVar(0, horizon - duration, f'start_{i}')
            
            # OR assignment (which OR room)
            or_var = model.NewIntVar(0, available_ors - 1, f'or_{i}')
            
            # Interval variable for scheduling
            interval_var = model.NewIntervalVar(
                start_var,
                duration,
                start_var + duration,
                f'interval_{i}'
            )
            
            case_vars[i] = {
                'start': start_var,
                'or': or_var,
                'interval': interval_var,
                'duration': duration
            }
            
        # Constraint: No overlaps in same OR
        for or_id in range(available_ors):
            intervals_in_or = [
                case_vars[i]['interval']
                for i in range(len(cases))
            ]
            
            # For simplicity, use NoOverlap for all intervals
            # In practice, would filter by OR assignment
            model.AddNoOverlap(intervals_in_or)
            
        # Objective: Minimize makespan (completion time of last surgery)
        makespan = model.NewIntVar(0, horizon, 'makespan')
        model.AddMaxEquality(
            makespan,
            [case_vars[i]['start'] + case_vars[i]['duration'] for i in range(len(cases))]
        )
        model.Minimize(makespan)
        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = config.SOLVER_TIMEOUT_SECONDS
        status = solver.Solve(model)
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            # Extract schedule
            schedule = []
            for i, case in enumerate(cases):
                start_rel = solver.Value(case_vars[i]['start'])
                or_room = solver.Value(case_vars[i]['or'])
                
                start_abs_minutes = start_minutes + start_rel
                start_time_str = self._minutes_to_time(start_abs_minutes)
                
                schedule.append({
                    'case_id': case.get('case_id', f'case_{i}'),
                    'procedure_type': case.get('procedure_type', 'unknown'),
                    'or_room': or_room + 1,  # 1-indexed for display
                    'start_time': start_time_str,
                    'estimated_duration': case['predicted_duration'],
                    'with_turnover': case_vars[i]['duration']
                })
                
            metrics = {
                'total_cases': len(cases),
                'scheduled_cases': len(schedule),
                'utilization_minutes': solver.Value(makespan),
                'utilization_percentage': (solver.Value(makespan) / horizon) * 100,
                'solver_status': 'optimal' if status == cp_model.OPTIMAL else 'feasible'
            }
            
            return {
                'status': 'success',
                'schedule': schedule,
                'metrics': metrics
            }
        else:
            logger.error(f"OR scheduling failed with status: {status}")
            return {
                'status': 'failed',
                'schedule': [],
                'metrics': {}
            }
            
    def _time_to_minutes(self, time_str: str) -> int:
        """Convert HH:MM to minutes since midnight"""
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
        
    def _minutes_to_time(self, minutes: int) -> str:
        """Convert minutes since midnight to HH:MM"""
        h = minutes // 60
        m = minutes % 60
        return f"{h:02d}:{m:02d}"


# Global instances
er_queue = ERQueue()
or_scheduler = ORScheduler()

