#!/usr/bin/env python3
"""
Data Migration Script: Convert from subcollection to flattened structure

This script migrates existing data from:
assessments/{assessmentId}/results/{questionId}

To:
assessment_items/{itemId}

Run this script ONCE after deploying the new Firestore rules and before switching to the new structure.
"""

import asyncio
import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def to_num(x, default=None):
    """Convert value to number safely"""
    try:
        return float(x)
    except Exception:
        return default

def derive_question_index(qid: str) -> int:
    """Derive question index from question_id (e.g., 'q1' -> 1)"""
    return int(qid[1:]) if qid and qid.startswith('q') and qid[1:].isdigit() else None

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if Firebase is already initialized
        try:
            app = firebase_admin.get_app()
            logger.info("Firebase app already exists, creating client")
            return firestore.client(app)
        except ValueError:
            # Firebase not initialized yet
            pass
        
        # Initialize with service account key
        service_account_path = "serviceAccountKey.json"
        if os.path.exists(service_account_path):
            abs_path = os.path.abspath(service_account_path)
            logger.info(f"Found service account key at: {abs_path}")
            
            cred = credentials.Certificate(abs_path)
            app = firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized successfully with service account key")
            
            return firestore.client(app)
        else:
            logger.error("No service account key found. Please add serviceAccountKey.json to the backend directory")
            return None
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        return None

async def migrate_data():
    """Main migration function"""
    try:
        db = initialize_firebase()
        if not db:
            logger.error("Firebase not available - cannot migrate data")
            return False
        
        logger.info("Starting data migration from subcollection to flattened structure...")
        
        # Get all assessments
        assessments = db.collection("assessments").stream()
        batch = db.batch()
        writes = 0
        migrated = 0
        total_assessments = 0
        
        # First, count total assessments
        for _ in db.collection("assessments").stream():
            total_assessments += 1
        
        logger.info(f"Found {total_assessments} assessments to process")
        
        for i, ass_doc in enumerate(assessments):
            aid = ass_doc.id
            ass = ass_doc.to_dict() or {}
            user_id = ass.get("user_id")
            
            logger.info(f"Processing assessment {i+1}/{total_assessments}: {aid}")
            
            if not user_id:
                logger.warning(f"Skipping assessment {aid} - no user_id")
                continue
            
            # Get results subcollection
            try:
                results_ref = db.collection("assessments").document(aid).collection("results")
                results = list(results_ref.stream())
                
                if not results:
                    logger.info(f"No results found for assessment {aid}")
                    continue
                
                logger.info(f"Found {len(results)} results for assessment {aid}")
                
                for res_doc in results:
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
                        
            except Exception as e:
                logger.error(f"Error processing assessment {aid}: {str(e)}")
                continue
        
        # Commit remaining writes
        if writes:
            batch.commit()
        
        logger.info(f"Migration completed! Migrated {migrated} result docs into assessment_items")
        
        # Verify migration
        verify_migration(db, migrated)
        
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        return False

def verify_migration(db, expected_count):
    """Verify that the migration was successful"""
    try:
        logger.info("Verifying migration...")
        
        # Count total items in new collection
        total_items = len(list(db.collection("assessment_items").stream()))
        logger.info(f"Total items in assessment_items: {total_items}")
        
        if total_items >= expected_count:
            logger.info("✅ Migration verification successful!")
        else:
            logger.warning(f"⚠️ Migration verification: Expected {expected_count}, found {total_items}")
        
        # Check for sample data
        sample_items = list(db.collection("assessment_items").limit(5).stream())
        if sample_items:
            logger.info("Sample migrated item structure:")
            sample_data = sample_items[0].to_dict()
            logger.info(f"Keys: {list(sample_data.keys())}")
            logger.info(f"Sample user_id: {sample_data.get('user_id')}")
            logger.info(f"Sample assessment_id: {sample_data.get('assessment_id')}")
            logger.info(f"Sample question_id: {sample_data.get('question_id')}")
        
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")

async def main():
    """Main entry point"""
    logger.info("=== Firestore Data Migration Script ===")
    logger.info("This script will migrate your existing data to the new flattened structure.")
    logger.info("Make sure you have:")
    logger.info("1. Updated firestore.rules")
    logger.info("2. Deployed firestore.indexes.json")
    logger.info("3. Backed up your data (recommended)")
    
    # Ask for confirmation
    response = input("\nDo you want to proceed with the migration? (yes/no): ")
    if response.lower() != 'yes':
        logger.info("Migration cancelled by user")
        return
    
    # Run migration
    success = await migrate_data()
    
    if success:
        logger.info("🎉 Migration completed successfully!")
        logger.info("You can now:")
        logger.info("1. Update your backend code to use the new functions")
        logger.info("2. Test the new structure")
        logger.info("3. Remove the old code when ready")
    else:
        logger.error("❌ Migration failed. Check the logs above for details.")

if __name__ == "__main__":
    asyncio.run(main())
