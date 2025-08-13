# Firestore Data Model Restructuring

## Overview

This document outlines the restructuring of your Firestore data model from a subcollection-based structure to a flattened, single-collection structure. This change is designed to:

1. **Eliminate subcollections** for better query performance
2. **Enable efficient dashboard queries** without complex joins
3. **Maintain all SpeechSuper response data** for detailed analysis
4. **Provide backward compatibility** during transition

## Current vs. New Structure

### Current Structure (Legacy)
```
assessments/{assessmentId}
├── user_id
├── status
├── created_at
└── results/ (subcollection)
    ├── q1/
    │   ├── scores
    │   ├── transcription
    │   ├── duration
    │   └── speechsuper_response
    ├── q2/
    └── q3/
```

### New Structure (Flattened)
```
assessment_items/{itemId}
├── user_id
├── assessment_id
├── question_id
├── question_index
├── created_at
├── start_time
├── end_time
├── dt_last_response_raw
├── transcription
├── duration_seconds
├── overall
├── pronunciation
├── fluency
├── rhythm
├── integrity
├── speed_wpm
├── pause_count
├── rear_tone
├── application_id
├── token_id
├── record_id
├── kernel_version
├── resource_version
├── speechsuper_response (complete)
└── metadata
```

## Key Benefits

### 1. **Dashboard Performance**
- Single collection queries are much faster
- No need to join across subcollections
- Direct access to all metrics for visualization

### 2. **Simplified Queries**
```javascript
// Old way (complex)
const assessment = await db.collection('assessments').doc(assessmentId).get();
const results = await db.collection('assessments').doc(assessmentId).collection('results').get();

// New way (simple)
const items = await db.collection('assessment_items')
  .where('assessment_id', '==', assessmentId)
  .orderBy('question_index')
  .get();
```

### 3. **Analytics Ready**
- All key metrics are top-level fields
- Easy to aggregate data across users/assessments
- Perfect for exporting to BI tools

### 4. **SpeechSuper Data Preservation**
- Complete `speechsuper_response` field preserved
- All original data accessible for detailed analysis
- No loss of information

## Migration Process

### Phase 1: Deploy New Structure
1. ✅ Update `firestore.rules` (already done)
2. ✅ Deploy `firestore.indexes.json` (already done)
3. ✅ Create new Firebase config functions (already done)

### Phase 2: Data Migration
1. **Backup your data** (recommended)
2. **Run migration script**:
   ```bash
   cd backend
   python migrate_data.py
   ```
3. **Verify migration** (script does this automatically)

### Phase 3: Code Update
1. **Update backend imports** to use new functions
2. **Test thoroughly** with new structure
3. **Remove legacy code** when confident

### Phase 4: Cleanup
1. **Archive old collections** (optional)
2. **Remove migration script**
3. **Update documentation**

## New Functions

### Storage
```python
# New flattened storage
await store_assessment_item(
    user_id, assessment_id, question_id,
    speechsuper_response, scores, transcription, duration,
    metadata, start_time, end_time
)

# Legacy function (redirects to new)
await store_assessment_result(...)  # Still works
```

### Retrieval
```python
# Get all items for a user
items = await get_assessment_items(user_id)

# Get items for specific assessment
items = await get_assessment_items(user_id, assessment_id)

# Get assessment summary
summary = await get_assessment_summary(user_id, assessment_id)
```

## Dashboard Queries

### User Performance Over Time
```javascript
const userProgress = await db.collection('assessment_items')
  .where('user_id', '==', userId)
  .orderBy('created_at', 'desc')
  .get();
```

### Assessment Comparison
```javascript
const assessmentData = await db.collection('assessment_items')
  .where('assessment_id', '==', assessmentId)
  .orderBy('question_index')
  .get();
```

### Score Analytics
```javascript
const highScores = await db.collection('assessment_items')
  .where('overall', '>', 80)
  .orderBy('overall', 'desc')
  .get();
```

## Field Mapping

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `scores.overall` | `overall` | Top-level for fast queries |
| `scores.pronunciation` | `pronunciation` | Denormalized |
| `scores.fluency` | `fluency` | Denormalized |
| `scores.rhythm` | `rhythm` | Denormalized |
| `scores.integrity` | `integrity` | Denormalized |
| `speechsuper_response.result.speed` | `speed_wpm` | Renamed for clarity |
| `speechsuper_response.result.pause_count` | `pause_count` | Denormalized |
| `speechsuper_response.result.rear_tone` | `rear_tone` | Denormalized |
| `speechsuper_response.applicationId` | `application_id` | Provenance tracking |
| `speechsuper_response.tokenId` | `token_id` | Provenance tracking |
| `speechsuper_response.recordId` | `record_id` | Provenance tracking |

## Security Rules

The new rules ensure:
- Users can only access their own data
- Required fields are validated
- Backward compatibility maintained

## Indexes

Optimized indexes for:
- User queries with time ordering
- Assessment-specific queries
- Score-based analytics
- Combined user + assessment queries

## Testing

### Before Migration
1. Test new functions in development
2. Verify Firestore rules work
3. Check indexes are created

### After Migration
1. Verify data integrity
2. Test all queries
3. Validate dashboard functionality
4. Performance testing

## Rollback Plan

If issues arise:
1. **Keep old collections** during transition
2. **Use legacy functions** as fallback
3. **Revert to old structure** if needed
4. **Data is preserved** in both structures

## Timeline

- **Week 1**: Deploy new structure and test
- **Week 2**: Run migration and validate
- **Week 3**: Update code and test thoroughly
- **Week 4**: Cleanup and documentation

## Support

For questions or issues:
1. Check this documentation
2. Review migration logs
3. Test with small datasets first
4. Contact development team

---

**Note**: This restructuring maintains 100% data compatibility while significantly improving query performance and dashboard capabilities.
