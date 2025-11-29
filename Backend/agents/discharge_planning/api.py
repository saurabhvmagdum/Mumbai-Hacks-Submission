"""
FastAPI service for Discharge Planning Agent
Provides discharge readiness assessment and planning
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
import logging

from model import discharge_engine
from agents.discharge_planning.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Swasthya Discharge Planning Agent",
    description="AI service for discharge readiness assessment and planning",
    version="1.0.0"
)


# Pydantic models
class Vitals(BaseModel):
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    heart_rate: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    respiratory_rate: Optional[int] = None


class PatientInput(BaseModel):
    patient_id: str
    admission_date: str
    diagnosis: str
    diagnosis_severity: Optional[int] = Field(default=2, ge=1, le=5)
    age: Optional[int] = 60
    vitals: Vitals
    pain_score: Optional[int] = Field(default=2, ge=0, le=10)
    mobility_score: Optional[int] = Field(default=3, ge=1, le=5)
    procedures_completed: List[str] = []
    procedures_required: List[str] = []
    comorbidities: List[str] = []
    has_home_support: bool = True


class DischargePlanningRequest(BaseModel):
    current_patients: List[PatientInput]


class DischargeCandidate(BaseModel):
    patient_id: str
    discharge_readiness_score: float
    ml_score: float
    ml_confidence: float
    rules_passed: bool
    criteria_met: Dict[str, bool]
    failed_criteria: List[str]
    estimated_discharge_date: str
    recommendations: List[str]
    model_version: str


class DischargePlanningResponse(BaseModel):
    discharge_candidates: List[DischargeCandidate]
    generated_at: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    timestamp: str


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Swasthya Discharge Planning Agent",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": discharge_engine.ml_model.is_trained
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if discharge_engine.ml_model.is_trained else "model_not_loaded",
        model_loaded=discharge_engine.ml_model.is_trained,
        timestamp=datetime.now().isoformat()
    )


@app.post("/analyze", response_model=DischargePlanningResponse, tags=["Discharge Planning"])
async def analyze_discharge_candidates(request: DischargePlanningRequest):
    """
    Analyze multiple patients for discharge readiness
    
    Args:
        request: DischargePlanningRequest with list of current patients
        
    Returns:
        DischargePlanningResponse with discharge candidates and recommendations
    """
    logger.info(f"Discharge planning request for {len(request.current_patients)} patients")
    
    try:
        candidates = []
        
        for patient in request.current_patients:
            # Convert to dictionary
            patient_data = patient.dict()
            
            # Analyze patient
            analysis = discharge_engine.analyze_patient(patient_data)
            
            # Convert to response model
            candidate = DischargeCandidate(**analysis)
            candidates.append(candidate)
            
        # Sort by readiness score (descending)
        candidates.sort(key=lambda x: x.discharge_readiness_score, reverse=True)
        
        response = DischargePlanningResponse(
            discharge_candidates=candidates,
            generated_at=datetime.now().isoformat()
        )
        
        logger.info(f"Analyzed {len(candidates)} patients for discharge")
        return response
        
    except Exception as e:
        logger.error(f"Discharge planning analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Discharge planning failed: {str(e)}"
        )


@app.post("/analyze-single", response_model=DischargeCandidate, tags=["Discharge Planning"])
async def analyze_single_patient(patient: PatientInput):
    """
    Analyze single patient for discharge readiness
    
    Args:
        patient: PatientInput with patient data
        
    Returns:
        DischargeCandidate with analysis
    """
    logger.info(f"Single patient discharge analysis for {patient.patient_id}")
    
    try:
        # Convert to dictionary
        patient_data = patient.dict()
        
        # Analyze patient
        analysis = discharge_engine.analyze_patient(patient_data)
        
        # Convert to response model
        result = DischargeCandidate(**analysis)
        
        logger.info(f"Analysis completed: Score={result.discharge_readiness_score:.2f}")
        return result
        
    except Exception as e:
        logger.error(f"Patient analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Patient analysis failed: {str(e)}"
        )


@app.get("/criteria", tags=["Configuration"])
async def get_discharge_criteria():
    """Get discharge criteria thresholds"""
    return {
        'criteria': config.DISCHARGE_CRITERIA,
        'risk_factors': config.RISK_FACTORS,
        'description': {
            'min_days_since_admission': 'Minimum days patient must be admitted',
            'max_temperature': 'Maximum acceptable temperature in Celsius',
            'min_oxygen_saturation': 'Minimum oxygen saturation percentage',
            'stable_vitals_hours': 'Hours of stable vitals required',
            'pain_score_max': 'Maximum pain score (0-10 scale)',
            'mobility_min_score': 'Minimum mobility score (1-5 scale)'
        }
    }


@app.get("/ready-now", tags=["Discharge Planning"])
async def get_ready_patients_summary():
    """
    Get summary of patients ready for discharge now
    (This would query the database in production)
    """
    return {
        'message': 'This endpoint would query database for ready patients in production',
        'timestamp': datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("="*60)
    logger.info("STARTING DISCHARGE PLANNING AGENT API")
    logger.info("="*60)
    logger.info(f"Host: {config.SERVICE_HOST}")
    logger.info(f"Port: {config.SERVICE_PORT}")
    logger.info(f"Model: {config.MODEL_TYPE}")
    logger.info("="*60)
    
    uvicorn.run(
        app,
        host=config.SERVICE_HOST,
        port=config.SERVICE_PORT,
        log_level="info"
    )

