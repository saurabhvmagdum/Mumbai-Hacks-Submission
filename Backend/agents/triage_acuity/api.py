"""
FastAPI service for Triage & Acuity Agent
Provides AI-assisted patient triage and acuity assessment
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
import logging

from model import triage_engine
from agents.triage_acuity.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Swasthya Triage & Acuity Agent",
    description="AI service for emergency department triage and patient acuity assessment",
    version="1.0.0"
)


# Pydantic models
class VitalSigns(BaseModel):
    heart_rate: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None


class TriageRequest(BaseModel):
    patient_id: str
    symptoms: str = Field(..., description="Free-text description of symptoms")
    vitals: VitalSigns
    age: Optional[int] = None
    medical_history: Optional[List[str]] = None


class TriageResponse(BaseModel):
    patient_id: str
    acuity_level: int
    acuity_label: str
    confidence: float
    ml_predicted_level: int
    override_applied: bool
    override_reason: str
    risk_factors: List[str]
    red_flags: List[str]
    recommended_action: str
    model_version: str
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    timestamp: str


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Swasthya Triage & Acuity Agent",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": triage_engine.classifier.is_trained
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if triage_engine.classifier.is_trained else "model_not_loaded",
        model_loaded=triage_engine.classifier.is_trained,
        timestamp=datetime.now().isoformat()
    )


@app.post("/triage", response_model=TriageResponse, tags=["Triage"])
async def triage_patient(request: TriageRequest):
    """
    Perform triage assessment for a patient
    
    Args:
        request: TriageRequest with patient data, symptoms, and vitals
        
    Returns:
        TriageResponse with acuity level and recommendations
    """
    logger.info(f"Triage request for patient: {request.patient_id}")
    
    try:
        # Prepare patient data
        patient_data = {
            'patient_id': request.patient_id,
            'symptoms': request.symptoms,
            'vitals': request.vitals.dict(exclude_none=True),
            'age': request.age or 50,
            'medical_history': request.medical_history or []
        }
        
        # Perform triage
        result = triage_engine.triage_patient(patient_data)
        
        # Add timestamp
        result['timestamp'] = datetime.now().isoformat()
        
        # Convert to response model
        response = TriageResponse(**result)
        
        logger.info(f"Triage completed for {request.patient_id}: Level {response.acuity_level}")
        return response
        
    except Exception as e:
        logger.error(f"Triage failed for patient {request.patient_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Triage assessment failed: {str(e)}"
        )


@app.post("/batch-triage", tags=["Triage"])
async def batch_triage(requests: List[TriageRequest]):
    """
    Perform triage for multiple patients
    
    Args:
        requests: List of TriageRequest objects
        
    Returns:
        List of TriageResponse objects
    """
    logger.info(f"Batch triage request for {len(requests)} patients")
    
    results = []
    for request in requests:
        try:
            patient_data = {
                'patient_id': request.patient_id,
                'symptoms': request.symptoms,
                'vitals': request.vitals.dict(exclude_none=True),
                'age': request.age or 50,
                'medical_history': request.medical_history or []
            }
            
            result = triage_engine.triage_patient(patient_data)
            result['timestamp'] = datetime.now().isoformat()
            results.append(TriageResponse(**result))
            
        except Exception as e:
            logger.error(f"Failed to triage patient {request.patient_id}: {str(e)}")
            # Continue with other patients
            
    return results


@app.get("/acuity-levels", tags=["Configuration"])
async def get_acuity_levels():
    """Get information about acuity levels"""
    return {
        'levels': config.ACUITY_LEVELS,
        'description': {
            1: 'Resuscitation - Immediate life-threatening condition',
            2: 'Emergent - Potential threat to life or limb',
            3: 'Urgent - Serious condition requiring prompt attention',
            4: 'Less Urgent - Condition not immediately life-threatening',
            5: 'Non-Urgent - Condition that could be managed in primary care'
        }
    }


@app.get("/red-flags", tags=["Configuration"])
async def get_red_flags():
    """Get list of red flag symptoms and vital thresholds"""
    return {
        'symptom_red_flags': config.RED_FLAG_KEYWORDS,
        'vital_thresholds': config.VITAL_THRESHOLDS
    }


@app.post("/override", tags=["Triage"])
async def log_override(
    patient_id: str,
    ai_level: int,
    nurse_level: int,
    reason: str
):
    """
    Log when a triage nurse overrides AI recommendation
    
    Args:
        patient_id: Patient identifier
        ai_level: AI-suggested acuity level
        nurse_level: Nurse-assigned acuity level
        reason: Reason for override
        
    Returns:
        Confirmation message
    """
    logger.info(f"Triage override logged for {patient_id}: AI={ai_level}, Nurse={nurse_level}")
    
    # In production, this would be stored in database for model improvement
    override_data = {
        'patient_id': patient_id,
        'ai_level': ai_level,
        'nurse_level': nurse_level,
        'reason': reason,
        'timestamp': datetime.now().isoformat()
    }
    
    # TODO: Store in database for future model retraining
    
    return {
        'status': 'logged',
        'message': 'Override logged successfully',
        'data': override_data
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("="*60)
    logger.info("STARTING TRIAGE & ACUITY AGENT API")
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

