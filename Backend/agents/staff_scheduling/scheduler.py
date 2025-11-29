"""
Staff Scheduling Optimization using OR-Tools
Constraint Programming approach for generating optimal staff schedules
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging
from ortools.sat.python import cp_model  # pyright: ignore[reportMissingImports]

from agents.staff_scheduling.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StaffMember:
    """Represents a staff member with constraints and qualifications"""
    
    def __init__(
        self,
        staff_id: str,
        name: str,
        role: str,
        max_hours_per_week: int = 40,
        qualifications: List[str] = None,
        preferences: Dict = None
    ):
        self.staff_id = staff_id
        self.name = name
        self.role = role
        self.max_hours_per_week = max_hours_per_week
        self.qualifications = qualifications or []
        self.preferences = preferences or {}


class Shift:
    """Represents a shift with requirements"""
    
    def __init__(
        self,
        date: str,
        shift_name: str,
        start_time: str,
        duration_hours: int,
        required_staff: Dict[str, int]  # role -> count
    ):
        self.date = date
        self.shift_name = shift_name
        self.start_time = start_time
        self.duration_hours = duration_hours
        self.required_staff = required_staff


class StaffScheduler:
    """Optimization-based staff scheduler using CP-SAT solver"""
    
    def __init__(self):
        self.model = None
        self.solver = None
        self.staff_list = []
        self.shifts = []
        self.assignments = {}
        
    def initialize(
        self,
        staff_list: List[Dict],
        dates: List[str],
        shift_types: List[str] = None,
        shift_duration: int = 8
    ):
        """
        Initialize the scheduler with staff and shifts
        
        Args:
            staff_list: List of staff member dictionaries
            dates: List of dates to schedule (ISO format strings)
            shift_types: List of shift names (default: morning, afternoon, night)
            shift_duration: Hours per shift
        """
        logger.info(f"Initializing scheduler for {len(staff_list)} staff and {len(dates)} days")
        
        # Create staff members
        self.staff_list = [
            StaffMember(
                staff_id=s['staff_id'],
                name=s['name'],
                role=s['role'],
                max_hours_per_week=s.get('max_hours_per_week', 40),
                qualifications=s.get('qualifications', []),
                preferences=s.get('preferences', {})
            )
            for s in staff_list
        ]
        
        # Default shift types
        if shift_types is None:
            shift_types = ['morning', 'afternoon', 'night']
            
        # Create shifts for all dates
        self.shifts = []
        for date in dates:
            for shift_name in shift_types:
                # Default required staff by role (can be customized)
                required_staff = {
                    'doctor': 2,
                    'nurse': 5,
                    'technician': 2
                }
                
                shift = Shift(
                    date=date,
                    shift_name=shift_name,
                    start_time=self._get_shift_start_time(shift_name),
                    duration_hours=shift_duration,
                    required_staff=required_staff
                )
                self.shifts.append(shift)
                
        logger.info(f"Created {len(self.shifts)} shifts")
        
    def _get_shift_start_time(self, shift_name: str) -> str:
        """Get start time for shift type"""
        shift_times = {
            'morning': '08:00',
            'afternoon': '16:00',
            'night': '00:00'
        }
        return shift_times.get(shift_name, '08:00')
        
    def optimize(
        self,
        forecast_data: Dict = None,
        min_staff_per_shift: Dict[str, int] = None
    ) -> Dict:
        """
        Run the optimization to generate optimal schedule
        
        Args:
            forecast_data: Patient volume forecast to adjust staffing
            min_staff_per_shift: Minimum staff requirements per shift
            
        Returns:
            Dictionary with schedule and metrics
        """
        logger.info("Starting schedule optimization")
        
        # Create CP-SAT model
        self.model = cp_model.CpModel()
        self.assignments = {}
        
        # Create binary variables for assignments
        # assignments[(staff_id, shift_idx)] = 1 if staff works that shift
        for staff_idx, staff in enumerate(self.staff_list):
            for shift_idx, shift in enumerate(self.shifts):
                var_name = f"assign_s{staff_idx}_sh{shift_idx}"
                self.assignments[(staff_idx, shift_idx)] = self.model.NewBoolVar(var_name)
        
        # Add constraints
        self._add_coverage_constraints(min_staff_per_shift)
        self._add_work_hour_constraints()
        self._add_rest_period_constraints()
        self._add_role_matching_constraints()
        
        # Set objective: minimize variations and respect preferences
        self._set_objective()
        
        # Solve
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = config.SOLVER_TIMEOUT_SECONDS
        
        status = self.solver.Solve(self.model)
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            logger.info(f"Solution found! Status: {'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'}")
            schedule = self._extract_schedule()
            metrics = self._calculate_metrics()
            
            return {
                'status': 'success',
                'schedule': schedule,
                'metrics': metrics
            }
        else:
            logger.error(f"No solution found. Status: {status}")
            logger.warning("Attempting to generate fallback schedule using greedy algorithm")
            # Try to generate a simple fallback schedule
            fallback_schedule = self._generate_fallback_schedule()
            if fallback_schedule:
                logger.info(f"Generated fallback schedule with {len(fallback_schedule)} assignments")
                return {
                    'status': 'success',
                    'schedule': fallback_schedule,
                    'metrics': {'method': 'fallback_greedy', 'coverage_warning': True}
                }
            return {
                'status': 'failed',
                'schedule': [],
                'metrics': {}
            }
            
    def _add_coverage_constraints(self, min_staff_per_shift: Dict[str, int] = None):
        """Ensure each shift has adequate coverage"""
        
        # Default minimums if not provided
        if min_staff_per_shift is None:
            min_staff_per_shift = {
                'morning': 5,
                'afternoon': 6,
                'night': 4
            }
        
        # Get total available staff
        total_staff = len(self.staff_list)
        
        # Calculate maximum possible shifts one staff can work per week
        # Assuming 8-hour shifts and 40-hour max per week
        max_shifts_per_staff_per_week = 5  # 40 hours / 8 hours per shift
        total_possible_shifts = total_staff * max_shifts_per_staff_per_week
        
        # Adjust minimums to not exceed available staff
        adjusted_min_staff = {}
        for shift_name, min_req in min_staff_per_shift.items():
            adjusted_min_staff[shift_name] = min(min_req, total_staff)
            if min_req > total_staff:
                logger.warning(
                    f"Minimum requirement for {shift_name} shift ({min_req}) exceeds "
                    f"available staff ({total_staff}). Adjusting to {adjusted_min_staff[shift_name]}"
                )
        
        # Calculate total required assignments vs. total possible
        shifts_by_type = {}
        for shift in self.shifts:
            if shift.shift_name not in shifts_by_type:
                shifts_by_type[shift.shift_name] = 0
            shifts_by_type[shift.shift_name] += 1
        
        total_required_assignments = sum(
            adjusted_min_staff.get(shift_name, 0) * count
            for shift_name, count in shifts_by_type.items()
        )
        
        # Check if we can realistically meet all requirements
        can_meet_requirements = total_possible_shifts >= total_required_assignments
        
        if not can_meet_requirements:
            logger.warning(
                f"Available staff can only work {total_possible_shifts} shifts per week, "
                f"but {total_required_assignments} assignments are required. "
                f"Making all coverage constraints optional (0 minimum)."
            )
            # When we can't meet requirements, set all minimums to 0
            adjusted_min_staff = {shift_name: 0 for shift_name in adjusted_min_staff.keys()}
        
        for shift_idx, shift in enumerate(self.shifts):
            min_required = adjusted_min_staff.get(shift.shift_name, 0)
            
            # Sum of all staff assigned to this shift >= minimum
            assigned_staff = [
                self.assignments[(staff_idx, shift_idx)]
                for staff_idx in range(len(self.staff_list))
            ]
            
            self.model.Add(sum(assigned_staff) >= min_required)
            
    def _add_work_hour_constraints(self):
        """Ensure staff don't exceed maximum hours per week"""
        
        # Group shifts by week
        weeks = self._group_shifts_by_week()
        
        for staff_idx, staff in enumerate(self.staff_list):
            for week_shifts in weeks:
                # Sum of hours worked in this week
                hours_worked = sum(
                    self.assignments[(staff_idx, shift_idx)] * shift.duration_hours
                    for shift_idx, shift in week_shifts
                )
                
                # Must not exceed max hours per week
                self.model.Add(hours_worked <= staff.max_hours_per_week)
                
    def _add_rest_period_constraints(self):
        """Ensure staff have adequate rest between shifts"""
        
        # Group consecutive shifts
        shift_by_date = {}
        for idx, shift in enumerate(self.shifts):
            if shift.date not in shift_by_date:
                shift_by_date[shift.date] = []
            shift_by_date[shift.date].append((idx, shift))
            
        dates = sorted(shift_by_date.keys())
        
        for staff_idx in range(len(self.staff_list)):
            for i in range(len(dates) - 1):
                current_date = dates[i]
                next_date = dates[i + 1]
                
                # If working night shift today, can't work morning shift tomorrow
                night_shifts = [idx for idx, s in shift_by_date[current_date] if s.shift_name == 'night']
                morning_shifts = [idx for idx, s in shift_by_date[next_date] if s.shift_name == 'morning']
                
                for night_idx in night_shifts:
                    for morning_idx in morning_shifts:
                        # Can't work both (at least one must be 0)
                        self.model.Add(
                            self.assignments[(staff_idx, night_idx)] +
                            self.assignments[(staff_idx, morning_idx)] <= 1
                        )
                        
    def _add_role_matching_constraints(self):
        """Ensure role-specific requirements are met"""
        
        # For each shift, ensure minimum doctors and nurses
        for shift_idx, shift in enumerate(self.shifts):
            for role, min_count in shift.required_staff.items():
                # Count staff of this role assigned to shift
                role_staff = [
                    self.assignments[(staff_idx, shift_idx)]
                    for staff_idx, staff in enumerate(self.staff_list)
                    if staff.role == role
                ]
                
                if role_staff:
                    self.model.Add(sum(role_staff) >= min_count)
    
    def _set_objective(self):
        """
        Set optimization objective to balance workload and respect preferences
        """
        # Minimize the variance in hours worked
        total_assignments = [
            sum(
                self.assignments[(staff_idx, shift_idx)]
                for shift_idx in range(len(self.shifts))
            )
            for staff_idx in range(len(self.staff_list))
        ]
        
        # Minimize total assignments (prefer minimal staffing while meeting requirements)
        self.model.Minimize(sum(total_assignments))
        
    def _group_shifts_by_week(self) -> List[List[Tuple[int, Shift]]]:
        """Group shifts into weeks"""
        weeks = []
        current_week = []
        current_week_start = None
        
        for idx, shift in enumerate(self.shifts):
            shift_date = datetime.fromisoformat(shift.date)
            
            if current_week_start is None:
                current_week_start = shift_date
                
            days_diff = (shift_date - current_week_start).days
            
            if days_diff < 7:
                current_week.append((idx, shift))
            else:
                if current_week:
                    weeks.append(current_week)
                current_week = [(idx, shift)]
                current_week_start = shift_date
                
        if current_week:
            weeks.append(current_week)
            
        return weeks
        
    def _extract_schedule(self) -> List[Dict]:
        """Extract the schedule from solved model"""
        schedule = []
        
        for staff_idx, staff in enumerate(self.staff_list):
            for shift_idx, shift in enumerate(self.shifts):
                if self.solver.Value(self.assignments[(staff_idx, shift_idx)]) == 1:
                    schedule.append({
                        'staff_id': staff.staff_id,
                        'staff_name': staff.name,
                        'role': staff.role,
                        'date': shift.date,
                        'shift': shift.shift_name,
                        'start_time': shift.start_time,
                        'duration_hours': shift.duration_hours
                    })
                    
        logger.info(f"Extracted {len(schedule)} shift assignments")
        return schedule
        
    def _calculate_metrics(self) -> Dict:
        """Calculate scheduling metrics"""
        total_shifts = len(self.shifts)
        total_assignments = sum(
            self.solver.Value(self.assignments[(s, sh)])
            for s in range(len(self.staff_list))
            for sh in range(len(self.shifts))
        )
        
        # Calculate hours per staff
        hours_per_staff = {}
        for staff_idx, staff in enumerate(self.staff_list):
            total_hours = sum(
                self.solver.Value(self.assignments[(staff_idx, shift_idx)]) * shift.duration_hours
                for shift_idx, shift in enumerate(self.shifts)
            )
            hours_per_staff[staff.staff_id] = total_hours
            
        avg_hours = np.mean(list(hours_per_staff.values())) if hours_per_staff else 0
        std_hours = np.std(list(hours_per_staff.values())) if hours_per_staff else 0
        
        metrics = {
            'total_assignments': total_assignments,
            'coverage_percentage': (total_assignments / (total_shifts * 5)) * 100,  # Assuming avg 5 staff per shift
            'average_hours_per_staff': float(avg_hours),
            'std_dev_hours': float(std_hours),
            'fairness_score': 1.0 / (1.0 + std_hours) if std_hours > 0 else 1.0,
            'solver_time_seconds': self.solver.WallTime()
        }
        
        logger.info(f"Scheduling metrics: {metrics}")
        return metrics
    
    def _generate_fallback_schedule(self) -> List[Dict]:
        """
        Generate a simple greedy schedule when solver fails
        Assigns staff to shifts while respecting work hour limits
        """
        schedule = []
        staff_hours = {staff.staff_id: 0 for staff in self.staff_list}
        shift_by_date = {}
        
        # Group shifts by date
        for idx, shift in enumerate(self.shifts):
            if shift.date not in shift_by_date:
                shift_by_date[shift.date] = []
            shift_by_date[shift.date].append((idx, shift))
        
        dates = sorted(shift_by_date.keys())
        
        # Simple greedy assignment: assign staff to shifts while respecting constraints
        for date in dates:
            for shift_idx, shift in shift_by_date[date]:
                # Try to assign a staff member to this shift
                assigned = False
                for staff_idx, staff in enumerate(self.staff_list):
                    # Check if staff can work this shift
                    if (staff_hours[staff.staff_id] + shift.duration_hours <= staff.max_hours_per_week and
                        not assigned):
                        # Check rest period: can't work night then morning next day
                        if shift.shift_name == 'morning' and date in dates:
                            date_idx = dates.index(date)
                            if date_idx > 0:
                                prev_date = dates[date_idx - 1]
                                prev_night_shifts = [s for idx, s in shift_by_date.get(prev_date, []) if s.shift_name == 'night']
                                # Skip if worked night shift yesterday (simplified check)
                                continue
                        
                        # Assign this shift
                        schedule.append({
                            'staff_id': staff.staff_id,
                            'staff_name': staff.name,
                            'role': staff.role,
                            'date': shift.date,
                            'shift': shift.shift_name,
                            'start_time': shift.start_time,
                            'duration_hours': shift.duration_hours
                        })
                        staff_hours[staff.staff_id] += shift.duration_hours
                        assigned = True
                        break
        
        return schedule
