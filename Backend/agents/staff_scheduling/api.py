"""
FastAPI service for Staff Scheduling Agent
Provides optimization-based staff scheduling
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging

from scheduler import StaffScheduler
from agents.staff_scheduling.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Swasthya Staff Scheduling Agent",
    description="Optimization service for hospital staff scheduling",
    version="1.0.0"
)


# Pydantic models
class StaffMemberInput(BaseModel):
    staff_id: str
    name: str
    role: str
    max_hours_per_week: int = 40
    qualifications: List[str] = []
    preferences: Optional[Dict] = None


class ForecastPrediction(BaseModel):
    date: str
    predicted_volume: float
    confidence_lower: float
    confidence_upper: float


class SchedulingRequest(BaseModel):
    forecast_data: Optional[Dict] = None
    staff_list: List[StaffMemberInput]
    constraints: Dict = Field(
        default={
            'min_staff_per_shift': {
                'morning': 5,
                'afternoon': 6,
                'night': 4
            },
            'shift_duration_hours': 8
        }
    )
    start_date: Optional[str] = None
    duration_days: int = 7


class ShiftAssignment(BaseModel):
    staff_id: str
    staff_name: str
    role: str
    date: str
    shift: str
    start_time: str
    duration_hours: int


class SchedulingResponse(BaseModel):
    status: str
    schedule: List[ShiftAssignment]
    metrics: Dict
    generated_at: str


class HealthResponse(BaseModel):
    status: str
    timestamp: str


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Swasthya Staff Scheduling Agent",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat()
    )


@app.post("/schedule", response_model=SchedulingResponse, tags=["Scheduling"])
async def generate_schedule(request: SchedulingRequest):
    """
    Generate optimal staff schedule
    
    Args:
        request: SchedulingRequest with staff list, forecast, and constraints
        
    Returns:
        SchedulingResponse with optimized schedule and metrics
    """
    logger.info(f"Schedule generation request received for {len(request.staff_list)} staff")
    
    try:
        # Generate dates
        if request.start_date:
            start_date = datetime.fromisoformat(request.start_date)
        else:
            start_date = datetime.now().date()
            
        dates = [
            (start_date + timedelta(days=i)).isoformat()
            for i in range(request.duration_days)
        ]
        
        # Initialize scheduler
        scheduler = StaffScheduler()
        
        # Convert staff input to dictionaries
        staff_list = [staff.dict() for staff in request.staff_list]
        
        # Initialize with staff and shifts
        scheduler.initialize(
            staff_list=staff_list,
            dates=dates,
            shift_duration=request.constraints.get('shift_duration_hours', 8)
        )
        
        # Run optimization
        result = scheduler.optimize(
            forecast_data=request.forecast_data,
            min_staff_per_shift=request.constraints.get('min_staff_per_shift')
        )
        
        if result['status'] == 'success':
            # Convert to response format
            schedule_assignments = [
                ShiftAssignment(**assignment)
                for assignment in result['schedule']
            ]
            
            response = SchedulingResponse(
                status='success',
                schedule=schedule_assignments,
                metrics=result['metrics'],
                generated_at=datetime.now().isoformat()
            )
            
            logger.info(f"Successfully generated schedule with {len(schedule_assignments)} assignments")
            return response
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate feasible schedule. Check constraints and staff availability."
            )
            
    except Exception as e:
        logger.error(f"Schedule generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Schedule generation failed: {str(e)}"
        )


@app.post("/optimize", tags=["Scheduling"])
async def optimize_existing_schedule(
    current_schedule: List[ShiftAssignment],
    constraints: Dict
):
    """
    Optimize an existing schedule
    
    Args:
        current_schedule: Current schedule to optimize
        constraints: Optimization constraints
        
    Returns:
        Optimized schedule
    """
    logger.info(f"Schedule optimization request received for {len(current_schedule)} assignments")
    
    # TODO: Implement schedule optimization logic
    # This would take existing schedule and try to improve it
    
    return {
        "message": "Schedule optimization not yet implemented",
        "current_schedule": current_schedule
    }


@app.get("/constraints/default", tags=["Configuration"])
async def get_default_constraints():
    """Get default scheduling constraints"""
    return {
        'min_staff_per_shift': {
            'morning': 5,
            'afternoon': 6,
            'night': 4
        },
        'max_hours_per_week': 40,
        'min_rest_hours': 12,
        'shift_duration_hours': 8,
        'shift_types': ['morning', 'afternoon', 'night']
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("="*60)
    logger.info("STARTING STAFF SCHEDULING AGENT API")
    logger.info("="*60)
    logger.info(f"Host: {config.SERVICE_HOST}")
    logger.info(f"Port: {config.SERVICE_PORT}")
    logger.info("="*60)
    
    uvicorn.run(
        app,
        host=config.SERVICE_HOST,
        port=config.SERVICE_PORT,
        log_level="info"
    )
