#!/usr/bin/env python3
"""
Test Script for New Firestore Structure

This script tests the new flattened structure without affecting production data.
Run this to verify everything works before migration.
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from firebase_config_new import (
    initialize_firebase,
    store_assessment_item,
    get_assessment_items,
    get_assessment_summary
)

async def test_new_structure():
    """Test the new Firestore structure with mock data"""
    print("🧪 Testing New Firestore Structure")
    print("=" * 50)
    
    # Initialize Firebase
    print("1. Initializing Firebase...")
    db = initialize_firebase()
    if not db:
        print("❌ Firebase not available - using mock mode")
        print("   This is expected in development without serviceAccountKey.json")
    else:
        print("✅ Firebase initialized successfully")
    
    # Test data
    test_user_id = "test_user_123"
    test_assessment_id = "test_assessment_456"
    test_question_id = "q1"
    
    # Mock SpeechSuper response
    mock_speechsuper_response = {
        "applicationId": "test_app_123",
        "tokenId": "test_token_456",
        "recordId": "test_record_789",
        "dtLastResponse": "2024-01-01T00:00:00Z",
        "result": {
            "overall": 85.5,
            "pronunciation": 80.0,
            "fluency": 90.0,
            "rhythm": 88.0,
            "integrity": 87.0,
            "speed": 120,
            "pause_count": 3,
            "rear_tone": "rise",
            "recognition": "This is a test transcription",
            "numeric_duration": 30.5,
            "kernel_version": "1.0.0",
            "resource_version": "2.0.0"
        }
    }
    
    mock_scores = {
        "overall": 85.5,
        "pronunciation": 80.0,
        "fluency": 90.0,
        "rhythm": 88.0,
        "integrity": 87.0
    }
    
    print(f"\n2. Testing store_assessment_item...")
    print(f"   User ID: {test_user_id}")
    print(f"   Assessment ID: {test_assessment_id}")
    print(f"   Question ID: {test_question_id}")
    
    # Test storage
    result = await store_assessment_item(
        user_id=test_user_id,
        assessment_id=test_assessment_id,
        question_id=test_question_id,
        speechsuper_response=mock_speechsuper_response,
        scores=mock_scores,
        transcription="This is a test transcription",
        duration=30.5,
        metadata={"test": True, "environment": "development"},
        start_time="2024-01-01T00:00:00Z",
        end_time="2024-01-01T00:00:30Z"
    )
    
    if result:
        print("✅ store_assessment_item test passed")
    else:
        print("❌ store_assessment_item test failed")
        return False
    
    print(f"\n3. Testing get_assessment_items...")
    
    # Test retrieval
    items = await get_assessment_items(test_user_id, test_assessment_id)
    
    if items and len(items) > 0:
        print(f"✅ get_assessment_items test passed - found {len(items)} items")
        
        # Show first item structure
        first_item = items[0]
        print(f"   First item keys: {list(first_item.keys())}")
        print(f"   User ID: {first_item.get('user_id')}")
        print(f"   Assessment ID: {first_item.get('assessment_id')}")
        print(f"   Question ID: {first_item.get('question_id')}")
        print(f"   Overall score: {first_item.get('overall')}")
        print(f"   SpeechSuper response preserved: {'speechsuper_response' in first_item}")
    else:
        print("❌ get_assessment_items test failed")
        return False
    
    print(f"\n4. Testing get_assessment_summary...")
    
    # Test summary
    summary = await get_assessment_summary(test_user_id, test_assessment_id)
    
    if summary:
        print("✅ get_assessment_summary test passed")
        print(f"   Summary: {summary}")
    else:
        print("❌ get_assessment_summary test failed")
        return False
    
    print(f"\n5. Testing data integrity...")
    
    # Verify key fields are properly extracted
    first_item = items[0]
    
    checks = [
        ("user_id", test_user_id),
        ("assessment_id", test_assessment_id),
        ("question_id", test_question_id),
        ("overall", 85.5),
        ("pronunciation", 80.0),
        ("fluency", 90.0),
        ("speed_wpm", 120),
        ("pause_count", 3),
        ("rear_tone", "rise"),
        ("application_id", "test_app_123"),
        ("token_id", "test_token_456"),
        ("record_id", "test_record_789")
    ]
    
    all_checks_passed = True
    for field, expected_value in checks:
        actual_value = first_item.get(field)
        if actual_value == expected_value:
            print(f"   ✅ {field}: {actual_value}")
        else:
            print(f"   ❌ {field}: expected {expected_value}, got {actual_value}")
            all_checks_passed = False
    
    if all_checks_passed:
        print("✅ All data integrity checks passed")
    else:
        print("❌ Some data integrity checks failed")
        return False
    
    print(f"\n🎉 All tests passed! New structure is working correctly.")
    print(f"\nNext steps:")
    print(f"1. Deploy firestore.rules and firestore.indexes.json")
    print(f"2. Run the migration script: python migrate_data.py")
    print(f"3. Update your backend code to use the new functions")
    
    return True

async def cleanup_test_data():
    """Clean up test data (only if Firebase is available)"""
    try:
        db = initialize_firebase()
        if db:
            print(f"\n🧹 Cleaning up test data...")
            
            # Delete test items
            test_items = db.collection("assessment_items").where("user_id", "==", "test_user_123").stream()
            deleted_count = 0
            
            for item in test_items:
                item.reference.delete()
                deleted_count += 1
            
            print(f"✅ Cleaned up {deleted_count} test items")
        else:
            print(f"ℹ️ No cleanup needed (Firebase not available)")
            
    except Exception as e:
        print(f"⚠️ Cleanup warning: {str(e)}")

async def main():
    """Main test function"""
    try:
        success = await test_new_structure()
        
        if success:
            # Ask if user wants to clean up test data
            response = input("\nDo you want to clean up test data? (yes/no): ")
            if response.lower() == 'yes':
                await cleanup_test_data()
        
        return success
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(main())
