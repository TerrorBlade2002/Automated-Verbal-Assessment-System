import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
from datetime import datetime
import json

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

# Store assessment result in Firestore
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
    Store assessment result in Firestore with comprehensive tracking
    """
    try:
        db = get_firestore_client()
        if not db:
            logger.warning("Firebase not available - using mock storage for development")
            # In development mode, log what would be stored
            logger.info(f"Mock storage: Assessment result for user {user_id}, assessment {assessment_id}, question {question_id}")
            logger.info(f"Mock storage: Scores - {scores}")
            logger.info(f"Mock storage: Transcription - {transcription}")
            return assessment_id  # Return the assessment ID for development
        
        # Generate proper assessment ID if frontend sent generic/invalid ID
        logger.info(f"Original assessment_id from frontend: {assessment_id}")
        logger.info(f"🔍 CHECKING FOR EXISTING ASSESSMENT FOR USER: {user_id}")
        
        # Check if frontend sent a placeholder that indicates we should create/find assessment
        if assessment_id in ['auto_generated', 'backend_will_create', 'unknown', 'temp_id']:
            logger.info(f"🔄 Frontend sent placeholder ID: {assessment_id} - will find/create proper assessment")
        
        # ALWAYS check for existing assessment first - ignore what frontend sends
        db = get_firestore_client()
        if not db:
            logger.warning("Firebase not available - using mock assessment ID")
            assessment_id = f"{user_id}_mock_{int(time.time())}"
        else:
            # Look for existing assessment for this user
            assessments_ref = db.collection("assessments")
            existing_assessments = assessments_ref.where("user_id", "==", user_id).stream()
            
            # Debug: Log all assessments found for this user
            all_assessments = list(existing_assessments)
            logger.info(f"🔍 FOUND {len(all_assessments)} assessments for user {user_id}")
            for i, doc in enumerate(all_assessments):
                doc_data = doc.to_dict()
                logger.info(f"  Assessment {i+1}: ID={doc.id}, Status={doc_data.get('status')}, Questions={doc_data.get('completed_questions', 0)}/3, Created={doc_data.get('created_at')}")
            
            existing_assessment = None
            for doc in all_assessments:
                doc_data = doc.to_dict()
                # Look for any assessment that's not fully completed (less than 3 questions)
                # Since we removed in_progress status, we check if it has question_results but not completed
                completed_questions = doc_data.get("completed_questions", 0)
                if doc_data.get("status") == "completed" and completed_questions >= 3:
                    logger.info(f"⏭️ SKIPPING fully completed assessment: {doc.id} with {completed_questions}/3 questions")
                    continue  # Skip fully completed assessments
                else:
                    # Found an assessment that can be updated (either in progress or not fully completed)
                    existing_assessment = doc
                    logger.info(f"✅ FOUND REUSABLE ASSESSMENT: ID={doc.id}, Status={doc_data.get('status')}, Questions={completed_questions}/3")
                    break
            
            if existing_assessment:
                # ALWAYS reuse existing assessment ID - ignore frontend assessment_id
                existing_data = existing_assessment.to_dict()
                logger.info(f"🔄 FORCING REUSE OF EXISTING ASSESSMENT ID: {existing_assessment.id} (ignoring frontend: {assessment_id})")
                assessment_id = existing_assessment.id
            else:
                # Create new assessment ID only if no existing one found
                import time
                old_id = assessment_id
                assessment_id = f"{user_id}_{int(time.time())}"
                logger.info(f"🆕 NO EXISTING ASSESSMENT FOUND - CREATING NEW: {old_id} -> {assessment_id}")
        
        logger.info(f"Final assessment_id being used: {assessment_id}")
        
        # CRITICAL SAFETY CHECK: If we found an existing assessment, NEVER create a new one
        if existing_assessment and assessment_id != existing_assessment.id:
            logger.error(f"🚨 CRITICAL ERROR: Found existing assessment {existing_assessment.id} but using different ID {assessment_id}")
            logger.error(f"🚨 This will cause duplicate assessments! Forcing use of existing ID.")
            assessment_id = existing_assessment.id
            logger.info(f"🚨 CORRECTED: Now using existing assessment ID: {assessment_id}")
        
        # Enhanced assessment result document with all SpeechSuper data
        assessment_result = {
            "user_id": user_id,
            "assessment_id": assessment_id,
            "question_id": question_id,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "start_time": start_time,
            "end_time": end_time,
            "scores": scores,
            "transcription": transcription,
            "duration": duration,
            "speechsuper_response": speechsuper_response,  # Complete SpeechSuper API response
            "detailed_analysis": {
                # Extract detailed analysis from SpeechSuper response
                "word_level_scores": speechsuper_response.get("result", {}).get("words", []),
                "phoneme_analysis": [],
                "pause_analysis": {
                    "pause_count": speechsuper_response.get("result", {}).get("pause_count", 0),
                    "total_pause_duration": 0  # Can be calculated from words data
                },
                "fluency_metrics": {
                    "speech_rate": speechsuper_response.get("result", {}).get("speed", 0),
                    "rhythm_score": speechsuper_response.get("result", {}).get("rhythm", 0)
                }
            },
            "metadata": metadata or {}
        }
        
        # Extract phoneme analysis if available
        if "result" in speechsuper_response and "words" in speechsuper_response["result"]:
            phoneme_data = []
            for word in speechsuper_response["result"]["words"]:
                if "phonemes" in word:
                    phoneme_data.extend(word["phonemes"])
            assessment_result["detailed_analysis"]["phoneme_analysis"] = phoneme_data
        
        # Store in assessments collection with subcollection for results
        doc_ref = db.collection("assessments").document(assessment_id).collection("results").document(question_id)
        doc_ref.set(assessment_result)
        
        # Get current assessment state to calculate overall progress
        # CRITICAL: Use the existing assessment document reference if we found one
        if existing_assessment:
            assessment_doc_ref = existing_assessment.reference
            assessment_doc = existing_assessment
            logger.info(f"🔒 Using existing assessment document reference: {existing_assessment.id}")
        else:
            assessment_doc_ref = db.collection("assessments").document(assessment_id)
            assessment_doc = assessment_doc_ref.get()
            logger.info(f"🆕 Using new assessment document reference: {assessment_id}")
        
        # Calculate question number for progress tracking
        question_num = int(question_id.replace('q', '')) if question_id.startswith('q') else 1
        total_questions = 3  # Fixed at 3 questions
        
        # CRITICAL: If we found an existing assessment, we MUST update it, never create new
        if existing_assessment:
            logger.info(f"🔒 UPDATING EXISTING ASSESSMENT: {existing_assessment.id}")
            # Update existing assessment
            current_data = existing_assessment.to_dict()
            question_results = current_data.get("question_results", {})
            question_results[question_id] = {
                "completed": True,
                "scores": scores,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "duration": duration
            }
            
            # Calculate overall score if all questions are completed
            completed_questions = len([q for q in question_results.values() if q.get("completed", False)])
            overall_score = None
            if completed_questions == total_questions:
                # Calculate average score across all questions
                total_score = sum(q["scores"].get("overall", 0) for q in question_results.values())
                overall_score = total_score / total_questions
            
            # ALWAYS set status to completed - no in_progress allowed
            assessment_status = "completed"  # FIXED: Only completed or failed allowed
            logger.info(f"Setting assessment status to: {assessment_status}")
            
            # Update fields
            update_data = {
                "question_results": question_results,
                "last_updated": firestore.SERVER_TIMESTAMP,
                "completed_questions": completed_questions,
                "progress_percentage": (completed_questions / total_questions) * 100,
                "status": assessment_status
            }
            
            # Add overall score and end time if assessment is complete
            if overall_score is not None:
                update_data["overall_score"] = overall_score
                update_data["assessment_end_time"] = end_time or firestore.SERVER_TIMESTAMP
                
            # Set start time if this is the first question
            if question_num == 1 and "assessment_start_time" not in current_data:
                update_data["assessment_start_time"] = start_time or firestore.SERVER_TIMESTAMP
            
            existing_assessment.reference.update(update_data)
            logger.info(f"✅ Successfully updated existing assessment: {existing_assessment.id}")
        elif assessment_doc.exists:
            # Fallback: Update existing assessment (this should rarely happen now)
            logger.info(f"🔄 Fallback: Updating existing assessment via document reference")
            current_data = assessment_doc.to_dict()
            question_results = current_data.get("question_results", {})
            question_results[question_id] = {
                "completed": True,
                "scores": scores,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "duration": duration
            }
            
            # Calculate overall score if all questions are completed
            completed_questions = len([q for q in question_results.values() if q.get("completed", False)])
            overall_score = None
            if completed_questions == total_questions:
                # Calculate average score across all questions
                total_score = sum(q["scores"].get("overall", 0) for q in question_results.values())
                overall_score = total_score / total_questions
            
            # ALWAYS set status to completed - no in_progress allowed
            assessment_status = "completed"  # FIXED: Only completed or failed allowed
            logger.info(f"Setting assessment status to: {assessment_status}")
            
            # Update fields
            update_data = {
                "question_results": question_results,
                "last_updated": firestore.SERVER_TIMESTAMP,
                "completed_questions": completed_questions,
                "progress_percentage": (completed_questions / total_questions) * 100,
                "status": assessment_status
            }
            
            # Add overall score and end time if assessment is complete
            if overall_score is not None:
                update_data["overall_score"] = overall_score
                update_data["assessment_end_time"] = end_time or firestore.SERVER_TIMESTAMP
                
            # Set start time if this is the first question
            if question_num == 1 and "assessment_start_time" not in current_data:
                update_data["assessment_start_time"] = start_time or firestore.SERVER_TIMESTAMP
            
            assessment_doc_ref.update(update_data)
            logger.info(f"✅ Successfully updated existing assessment via fallback: {assessment_id}")
        else:
            # Create new assessment document with comprehensive tracking
            logger.warning(f"🚨 CREATING NEW ASSESSMENT DOCUMENT - This should NOT happen if existing assessment was found!")
            logger.info(f"Creating NEW assessment with ID: {assessment_id} and status: completed")
            new_assessment = {
                "user_id": user_id,
                "assessment_id": assessment_id,
                "created_at": firestore.SERVER_TIMESTAMP,
                "assessment_start_time": start_time or firestore.SERVER_TIMESTAMP,
                "last_updated": firestore.SERVER_TIMESTAMP,
                "status": "completed",
                "total_questions": total_questions,
                "completed_questions": 1,
                "progress_percentage": (1 / total_questions) * 100,
                "question_results": {
                    question_id: {
                        "completed": True,
                        "scores": scores,
                        "timestamp": firestore.SERVER_TIMESTAMP,
                        "duration": duration
                    }
                }
            }
            
            # If this completes the assessment (unlikely for first question, but safety check)
            if question_num == total_questions:
                new_assessment["overall_score"] = scores.get("overall", 0)
                new_assessment["assessment_end_time"] = end_time or firestore.SERVER_TIMESTAMP
                new_assessment["status"] = "completed"
            
            assessment_doc_ref.set(new_assessment)
        
        logger.info(f"Assessment result stored for user: {user_id}, assessment: {assessment_id}, question: {question_id}")
        return assessment_id  # Return the assessment ID (generated or provided)
        
    except Exception as e:
        logger.error(f"Failed to store assessment result: {str(e)}")
        return False

async def get_assessment_results(user_id: str, assessment_id: str):
    """
    Get assessment results for a user and assessment
    """
    try:
        db = get_firestore_client()
        if not db:
            logger.warning("Firebase not available - returning mock results for development")
            # Return mock results for development
            return [
                {
                    "id": "q1",
                    "user_id": user_id,
                    "assessment_id": assessment_id,
                    "question_id": "q1",
                    "scores": {"overall": 85, "pronunciation": 80, "fluency": 90},
                    "transcription": "Mock transcription for development",
                    "duration": 30.5
                },
                {
                    "id": "q2", 
                    "user_id": user_id,
                    "assessment_id": assessment_id,
                    "question_id": "q2",
                    "scores": {"overall": 88, "pronunciation": 85, "fluency": 92},
                    "transcription": "Mock transcription for development",
                    "duration": 45.2
                }
            ]
        
        # Get all results for the assessment
        logger.info(f"Querying Firestore for assessment {assessment_id} results...")
        
        try:
            # Check if the assessment document exists first
            assessment_doc = db.collection("assessments").document(assessment_id).get()
            if not assessment_doc.exists:
                logger.warning(f"Assessment document {assessment_id} does not exist")
                return []
            
            logger.info(f"Assessment document {assessment_id} exists, checking for results subcollection...")
            
            # Try to get results from the subcollection
            results_ref = db.collection("assessments").document(assessment_id).collection("results")
            results = results_ref.where("user_id", "==", user_id).stream()
            
            assessment_results = []
            for i, result in enumerate(results):
                logger.info(f"Processing result {i+1}...")
                result_data = result.to_dict()
                result_data["id"] = result.id
                logger.info(f"Result {i+1} keys: {list(result_data.keys())}")
                
                # Convert any Firestore datetime objects to JSON-serializable format
                logger.info(f"Converting datetime objects for result {i+1}...")
                result_data = convert_firestore_datetime(result_data)
                logger.info(f"Result {i+1} datetime conversion completed")
                
                assessment_results.append(result_data)
            
            logger.info(f"Returning {len(assessment_results)} processed results")
            return assessment_results
            
        except Exception as query_error:
            logger.error(f"Error querying Firestore results: {str(query_error)}")
            # Return empty results instead of failing
            return []
        
    except Exception as e:
        logger.error(f"Failed to get assessment results: {str(e)}")
        return []

async def update_assessment_status(assessment_id: str, status: str):
    """
    Update assessment status (completed, failed, etc.)
    """
    try:
        db = get_firestore_client()
        if not db:
            logger.warning(f"Firebase not available - mock update assessment {assessment_id} status to: {status}")
            return True  # Return success for development
        
        assessment_doc_ref = db.collection("assessments").document(assessment_id)
        assessment_doc_ref.update({
            "status": status,
            "last_updated": firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"Assessment {assessment_id} status updated to: {status}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to update assessment status: {str(e)}")
        return False


