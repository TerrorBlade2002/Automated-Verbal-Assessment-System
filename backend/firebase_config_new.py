import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
from datetime import datetime
import json
import time

logger = logging.getLogger(__name__)

def convert_firestore_datetime(obj):
    """
    Convert Firestore DatetimeWithNanoseconds objects to ISO format strings
    for JSON serialization. Recursively processes nested dictionaries and lists.
    """
    if hasattr(obj, 'isoformat'):
        # Convert Firestore datetime objects to ISO format
        return obj.isoformat()
    elif isinstance(obj, dict):
        # Recursively process dictionary values
        return {key: convert_firestore_datetime(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        # Recursively process list items
        return [convert_firestore_datetime(item) for item in obj]
    else:
        # Return as-is for other types
        return obj

def to_num(x, default=None):
    """Convert value to number safely"""
    try:
        return float(x)
    except Exception:
        return default

def derive_question_index(qid: str) -> int:
    """Derive question index from question_id (e.g., 'q1' -> 1)"""
    return int(qid[1:]) if qid and qid.startswith('q') and qid[1:].isdigit() else None

# Global database client to prevent re-initialization
db = None

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global db
    
    if db is not None:
        logger.info("Firebase already initialized and cached")
        return db
    
    try:
        # Check if Firebase is already initialized
        try:
            app = firebase_admin.get_app()
            logger.info("Firebase app already exists, creating client")
            db = firestore.client(app)
            return db
        except ValueError:
            # Firebase not initialized yet
            pass
        
        # Initialize with service account key (in production)
        service_account_path = "serviceAccountKey.json"
        if os.path.exists(service_account_path):
            # Get absolute path to ensure Firebase finds the file
            abs_path = os.path.abspath(service_account_path)
            logger.info(f"Found service account key at: {abs_path}")
            
            # Verify the file is readable
            with open(service_account_path, 'r') as f:
                import json
                config = json.load(f)
                logger.info(f"Service account project_id: {config.get('project_id', 'unknown')}")
            
            cred = credentials.Certificate(abs_path)
            app = firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized successfully with service account key")
            
            # Create and cache the Firestore client
            db = firestore.client(app)
            logger.info("Firestore client created and cached")
            return db
        else:
            # For development - use mock mode or emulator
            logger.warning("No service account key found. Using mock mode for development.")
            logger.info("To use real Firebase, add serviceAccountKey.json to the backend directory")
            logger.info(f"Current working directory: {os.getcwd()}")
            # Don't initialize Firebase - use mock storage instead
            db = None
            return None
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        logger.warning("Firebase not available - will use mock storage for development")
        db = None
        return None

# Get Firestore client
def get_firestore_client():
    """Get Firestore client instance"""
    global db
    
    if db is not None:
        return db
    
    # Try to initialize if not already done
    return initialize_firebase()

# NEW: Flattened assessment item storage (replaces subcollection structure)
async def store_assessment_item(
    user_id: str,
    assessment_id: str,
    question_id: str,
    speechsuper_response: dict,
    scores: dict,
    transcription: str,
    duration: float,
    metadata: dict = None,
    start_time: str = None,
    end_time: str = None
):
    """
    Store assessment item in the new flattened assessment_items collection
    This replaces the old subcollection structure
    """
    try:
        db = get_firestore_client()
        if not db:
            logger.warning("Firebase not available - using mock storage for development")
            # In development mode, log what would be stored
            logger.info(f"Mock storage: Assessment item for user {user_id}, assessment {assessment_id}, question {question_id}")
            logger.info(f"Mock storage: Scores - {scores}")
            logger.info(f"Mock storage: Transcription - {transcription}")
            return assessment_id  # Return the assessment ID for development
        
        # Extract data from SpeechSuper response
        r = (speechsuper_response or {}).get("result", {}) if speechsuper_response else {}
        
        # Create the flattened document structure
        doc = {
            "user_id": user_id,
            "assessment_id": assessment_id,
            "question_id": question_id,
            "question_index": derive_question_index(question_id),
            "created_at": firestore.SERVER_TIMESTAMP,
            "start_time": start_time,
            "end_time": end_time,
            "dt_last_response_raw": (speechsuper_response or {}).get("dtLastResponse"),
            
            # Core assessment data
            "transcription": transcription or r.get("recognition"),
            "duration_seconds": duration or r.get("numeric_duration"),
            
            # Denormalized key metrics for fast dashboards
            "overall": to_num(r.get("overall", (scores or {}).get("overall")),
            "pronunciation": to_num(r.get("pronunciation", (scores or {}).get("pronunciation")),
            "fluency": to_num(r.get("fluency", (scores or {}).get("fluency")),
            "rhythm": to_num(r.get("rhythm", (scores or {}).get("rhythm")),
            "integrity": to_num(r.get("integrity", (scores or {}).get("integrity")),
            "speed_wpm": r.get("speed") if isinstance(r.get("speed"), (int, float)) else None,
            "pause_count": r.get("pause_count") if isinstance(r.get("pause_count"), int) else None,
            "rear_tone": r.get("rear_tone") if isinstance(r.get("rear_tone"), str) else None,
            
            # Provenance / versions
            "application_id": (speechsuper_response or {}).get("applicationId"),
            "token_id": (speechsuper_response or {}).get("tokenId"),
            "record_id": (speechsuper_response or {}).get("recordId"),
            "kernel_version": r.get("kernel_version"),
            "resource_version": r.get("resource_version"),
            
            # Keep the whole SpeechSuper response unchanged
            "speechsuper_response": speechsuper_response,
            
            # Optional metadata
            "metadata": metadata or {}
        }
        
        # Store in the new flattened collection
        doc_ref = db.collection("assessment_items").add(doc)
        
        logger.info(f"Assessment item stored in flattened collection for user: {user_id}, assessment: {assessment_id}, question: {question_id}")
        return doc_ref[1].id  # Return the document ID
        
    except Exception as e:
        logger.error(f"Failed to store assessment item: {str(e)}")
        return False

# NEW: Get assessment items from flattened collection
async def get_assessment_items(user_id: str, assessment_id: str = None):
    """
    Get assessment items from the new flattened collection
    """
    try:
        db = get_firestore_client()
        if not db:
            logger.warning("Firebase not available - returning mock results for development")
            # Return mock results for development
            return [
                {
                    "id": "mock_id_1",
                    "user_id": user_id,
                    "assessment_id": assessment_id or "mock_assessment",
                    "question_id": "q1",
                    "question_index": 1,
                    "overall": 85,
                    "pronunciation": 80,
                    "fluency": 90,
                    "transcription": "Mock transcription for development",
                    "duration_seconds": 30.5
                }
            ]
        
        # Query the flattened collection
        query = db.collection("assessment_items").where("user_id", "==", user_id)
        
        if assessment_id:
            query = query.where("assessment_id", "==", assessment_id)
        
        # Order by creation time (newest first)
        query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
        
        results = query.stream()
        
        assessment_items = []
        for result in results:
            result_data = result.to_dict()
            result_data["id"] = result.id
            
            # Convert any Firestore datetime objects to JSON-serializable format
            result_data = convert_firestore_datetime(result_data)
            
            assessment_items.append(result_data)
        
        logger.info(f"Retrieved {len(assessment_items)} assessment items")
        return assessment_items
        
    except Exception as e:
        logger.error(f"Failed to get assessment items: {str(e)}")
        return []

# NEW: Get assessment summary from flattened collection
async def get_assessment_summary(user_id: str, assessment_id: str):
    """
    Get assessment summary by aggregating data from assessment_items
    """
    try:
        db = get_firestore_client()
        if not db:
            logger.warning("Firebase not available - returning mock summary for development")
            return {
                "assessment_id": assessment_id,
                "user_id": user_id,
                "total_questions": 3,
                "completed_questions": 3,
                "overall_score": 86.5,
                "start_time": "2024-01-01T00:00:00Z",
                "end_time": "2024-01-01T00:05:00Z",
                "status": "completed"
            }
        
        # Get all items for this assessment
        items = await get_assessment_items(user_id, assessment_id)
        
        if not items:
            return None
        
        # Calculate summary
        total_questions = len(items)
        overall_scores = [item.get("overall", 0) for item in items if item.get("overall") is not None]
        overall_score = sum(overall_scores) / len(overall_scores) if overall_scores else None
        
        # Get start and end times
        start_times = [item.get("start_time") for item in items if item.get("start_time")]
        end_times = [item.get("end_time") for item in items if item.get("end_time")]
        
        start_time = min(start_times) if start_times else None
        end_time = max(end_times) if end_times else None
        
        summary = {
            "assessment_id": assessment_id,
            "user_id": user_id,
            "total_questions": total_questions,
            "completed_questions": total_questions,
            "overall_score": overall_score,
            "start_time": start_time,
            "end_time": end_time,
            "status": "completed" if total_questions == 3 else "in_progress"
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Failed to get assessment summary: {str(e)}")
        return None

# Migration function to convert existing data
async def migrate_existing_data():
    """
    Migrate existing data from assessments/{id}/results/{id} to assessment_items
    Run this once to convert your existing data structure
    """
    try:
        db = get_firestore_client()
        if not db:
            logger.error("Firebase not available - cannot migrate data")
            return False
        
        logger.info("Starting data migration from subcollection to flattened structure...")
        
        # Get all assessments
        assessments = db.collection("assessments").stream()
        batch = db.batch()
        writes = 0
        migrated = 0
        
        for ass_doc in assessments:
            aid = ass_doc.id
            ass = ass_doc.to_dict() or {}
            user_id = ass.get("user_id")
            
            if not user_id:
                logger.warning(f"Skipping assessment {aid} - no user_id")
                continue
            
            # Get results subcollection
            results_ref = db.collection("assessments").document(aid).collection("results")
            for res_doc in results_ref.stream():
                res = res_doc.to_dict() or {}
                qid = res_doc.id
                
                # Prefer raw SpeechSuper response from existing field
                ss = res.get("speechsuper_response") or {}
                
                # Pull denorm metrics either from ss.result or from existing 'scores'
                r = (ss.get("result") or {})
                scores = res.get("scores") or {}
                
                # Create the flattened document
                doc = {
                    "user_id": user_id,
                    "assessment_id": aid,
                    "question_id": qid,
                    "question_index": derive_question_index(qid),
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "start_time": res.get("start_time"),
                    "end_time": res.get("end_time"),
                    "dt_last_response_raw": ss.get("dtLastResponse"),
                    "transcription": res.get("transcription", r.get("recognition")),
                    "duration_seconds": to_num(res.get("duration"), r.get("numeric_duration")),
                    
                    # Denormalized metrics
                    "overall": to_num(r.get("overall"), scores.get("overall")),
                    "pronunciation": to_num(r.get("pronunciation"), scores.get("pronunciation")),
                    "fluency": to_num(r.get("fluency"), scores.get("fluency")),
                    "rhythm": to_num(r.get("rhythm"), scores.get("rhythm")),
                    "integrity": to_num(r.get("integrity"), scores.get("integrity")),
                    "speed_wpm": r.get("speed") if isinstance(r.get("speed"), (int, float)) else None,
                    "pause_count": r.get("pause_count") if isinstance(r.get("pause_count"), int) else None,
                    "rear_tone": r.get("rear_tone") if isinstance(r.get("rear_tone"), str) else None,
                    
                    # Provenance
                    "application_id": ss.get("applicationId"),
                    "token_id": ss.get("tokenId"),
                    "record_id": ss.get("recordId"),
                    "kernel_version": r.get("kernel_version"),
                    "resource_version": r.get("resource_version"),
                    
                    # Keep full response
                    "speechsuper_response": ss,
                    "metadata": res.get("metadata") or {},
                }
                
                # Add to batch
                dst_ref = db.collection("assessment_items").document()
                batch.set(dst_ref, doc)
                writes += 1
                migrated += 1
                
                # Commit periodically to avoid 500-op batch limit
                if writes >= 450:
                    batch.commit()
                    batch = db.batch()
                    writes = 0
                    logger.info(f"Committed batch, migrated {migrated} items so far...")
        
        # Commit remaining writes
        if writes:
            batch.commit()
        
        logger.info(f"Migration completed! Migrated {migrated} result docs into assessment_items")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        return False

# Legacy function for backward compatibility (can be removed after migration)
async def store_assessment_result(
    user_id: str,
    assessment_id: str,
    question_id: str,
    speechsuper_response: dict,
    scores: dict,
    transcription: str,
    duration: float,
    metadata: dict = None,
    start_time: str = None,
    end_time: str = None
):
    """
    Legacy function - now calls the new flattened storage
    """
    logger.info("Using legacy store_assessment_result - redirecting to new flattened structure")
    return await store_assessment_item(
        user_id, assessment_id, question_id, speechsuper_response,
        scores, transcription, duration, metadata, start_time, end_time
    )

# Legacy function for backward compatibility
async def get_assessment_results(user_id: str, assessment_id: str):
    """
    Legacy function - now calls the new flattened retrieval
    """
    logger.info("Using legacy get_assessment_results - redirecting to new flattened structure")
    return await get_assessment_items(user_id, assessment_id)

# Legacy function for backward compatibility
async def update_assessment_status(assessment_id: str, status: str):
    """
    Legacy function - status is now derived from assessment_items
    """
    logger.info("Using legacy update_assessment_status - status is now derived from assessment_items")
    return True
