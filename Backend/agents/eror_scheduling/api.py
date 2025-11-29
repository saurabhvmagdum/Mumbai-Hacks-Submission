"""
FastAPI service for ER/OR Scheduling Agent
Provides ER queue management and OR scheduling optimization
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
import logging

from scheduler import er_queue, or_scheduler
from agents.eror_scheduling.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Swasthya ER/OR Scheduling Agent",
    description="Service for ER queue management and OR scheduling optimization",
    version="1.0.0"
)


# Pydantic models for ER
class ERPatient(BaseModel):
    patient_id: str
    acuity_level: int = Field(..., ge=1, le=5)
    arrival_time: Optional[str] = None


class NextPatientResponse(BaseModel):
    patient_id: str
    acuity_level: int
    wait_minutes: float
    priority_score: float


# Pydantic models for OR
class SurgicalCase(BaseModel):
    case_id: str
    procedure_type: str
    patient_age: Optional[int] = 50
    complexity_score: Optional[int] = Field(default=2, ge=1, le=5)
    estimated_duration: Optional[int] = None
    priority: Optional[int] = 1


class ORScheduleRequest(BaseModel):
    cases: List[SurgicalCase]
    available_ors: int = Field(default=4, ge=1, le=20)
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class ScheduledCase(BaseModel):
    case_id: str
    procedure_type: str
    or_room: int
    start_time: str
    estimated_duration: int
    with_turnover: int


class ORScheduleResponse(BaseModel):
    status: str
    schedule: List[ScheduledCase]
    metrics: Dict
    generated_at: str


class HealthResponse(BaseModel):
    status: str
    timestamp: str


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Swasthya ER/OR Scheduling Agent",
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


# ER Endpoints
@app.post("/er/add-patient", tags=["ER Queue"])
async def add_er_patient(patient: ERPatient):
    """
    Add patient to ER queue
    
    Args:
        patient: ERPatient with patient_id and acuity_level
        
    Returns:
        Confirmation message
    """
    logger.info(f"Adding patient {patient.patient_id} to ER queue")
    
    try:
        patient_data = patient.dict()
        er_queue.add_patient(patient_data)
        
        return {
            'status': 'success',
            'message': f'Patient {patient.patient_id} added to ER queue',
            'queue_size': len(er_queue.queue),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to add patient to ER queue: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add patient: {str(e)}"
        )


@app.get("/er/next-patient", tags=["ER Queue"])
async def get_next_er_patient():
    """
    Get next patient to be seen from ER queue
    
    Returns:
        Next patient with priority information
    """
    logger.info("Retrieving next ER patient")
    
    try:
        next_patient = er_queue.get_next_patient()
        
        if next_patient is None:
            return {
                'status': 'empty',
                'message': 'No patients in ER queue',
                'patient': None
            }
            
        # Calculate wait time
        added_time = datetime.fromisoformat(next_patient['added_time'])
        wait_minutes = (datetime.now() - added_time).total_seconds() / 60
        
        return {
            'status': 'success',
            'patient': NextPatientResponse(
                patient_id=next_patient['patient_id'],
                acuity_level=next_patient['acuity_level'],
                wait_minutes=wait_minutes,
                priority_score=next_patient['priority_score']
            ),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get next ER patient: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get next patient: {str(e)}"
        )


@app.get("/er/queue-status", tags=["ER Queue"])
async def get_er_queue_status():
    """Get current ER queue statistics"""
    try:
        status = er_queue.get_queue_status()
        return {
            'status': 'success',
            'queue_status': status,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get queue status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get queue status: {str(e)}"
        )


@app.put("/er/update-acuity", tags=["ER Queue"])
async def update_patient_acuity(patient_id: str, new_acuity: int):
    """
    Update patient acuity level (re-triage)
    
    Args:
        patient_id: Patient identifier
        new_acuity: New acuity level (1-5)
        
    Returns:
        Confirmation message
    """
    logger.info(f"Updating acuity for patient {patient_id} to {new_acuity}")
    
    if new_acuity < 1 or new_acuity > 5:
        raise HTTPException(
            status_code=400,
            detail="Acuity level must be between 1 and 5"
        )
        
    try:
        success = er_queue.update_patient_acuity(patient_id, new_acuity)
        
        if success:
            return {
                'status': 'success',
                'message': f'Acuity updated for patient {patient_id}',
                'new_acuity': new_acuity
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Patient {patient_id} not found in queue"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update acuity: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update acuity: {str(e)}"
        )


# OR Endpoints
@app.post("/or/schedule", response_model=ORScheduleResponse, tags=["OR Scheduling"])
async def schedule_or_cases(request: ORScheduleRequest):
    """
    Schedule surgical cases across available ORs
    
    Args:
        request: ORScheduleRequest with cases and constraints
        
    Returns:
        ORScheduleResponse with optimized schedule
    """
    logger.info(f"OR scheduling request for {len(request.cases)} cases")
    
    try:
        # Convert cases to dictionaries
        cases_data = [case.dict() for case in request.cases]
        
        # Run scheduler
        result = or_scheduler.schedule_cases(
            cases=cases_data,
            available_ors=request.available_ors,
            start_time=request.start_time,
            end_time=request.end_time
        )
        
        if result['status'] == 'success':
            scheduled_cases = [
                ScheduledCase(**case) for case in result['schedule']
            ]
            
            response = ORScheduleResponse(
                status='success',
                schedule=scheduled_cases,
                metrics=result['metrics'],
                generated_at=datetime.now().isoformat()
            )
            
            logger.info(f"Successfully scheduled {len(scheduled_cases)} cases")
            return response
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate feasible OR schedule"
            )
            
    except Exception as e:
        logger.error(f"OR scheduling failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"OR scheduling failed: {str(e)}"
        )


@app.get("/or/configuration", tags=["OR Configuration"])
async def get_or_configuration():
    """Get OR scheduling configuration"""
    return {
        'opening_time': config.OR_OPENING_TIME,
        'closing_time': config.OR_CLOSING_TIME,
        'turnover_time_minutes': config.DEFAULT_TURNOVER_TIME_MINUTES,
        'solver_timeout_seconds': config.SOLVER_TIMEOUT_SECONDS
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("="*60)
    logger.info("STARTING ER/OR SCHEDULING AGENT API")
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

