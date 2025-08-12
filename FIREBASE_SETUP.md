# Firebase Setup Guide

## Step 1: Create Firestore Database

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `verbal-test-c52b4`
3. **Click "Firestore Database"** in the left sidebar
4. **Click "Create database"**
5. **Choose security rules**: Select "Start in test mode" (we'll update rules later)
6. **Choose location**: Select a region close to your users (e.g., `us-central1`)
7. **Click "Done"**

## Step 2: Deploy Security Rules

### Option A: Using Firebase CLI (Recommended)

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project**:
   ```bash
   firebase init firestore
   ```
   - Select your project: `verbal-test-c52b4`
   - Use existing rules file: `firestore.rules`
   - Use existing indexes file: `firestore.indexes.json` (create if doesn't exist)

4. **Deploy rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option B: Using Firebase Console

1. **Go to Firebase Console** → Firestore Database → Rules
2. **Replace existing rules** with the content from `firestore.rules`
3. **Click "Publish"**

## Step 3: Verify Database Structure

After creating the database, you should see:

### Collections:
- `users` - Stores user registration data
- `assessments` - Stores assessment results

### Users Collection Structure:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Assessments Collection Structure:
```json
{
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "questions": [
    {
      "questionNumber": 1,
      "question": "Tell me about a time when...",
      "audioUrl": "https://...",
      "scores": {
        "pronunciation": 85,
        "fluency": 90,
        "clarity": 88,
        "confidence": 92,
        "overall": 89
      },
      "transcription": "User's spoken response...",
      "duration": 45,
      "wordCount": 25
    }
  ],
  "overallScore": 89,
  "completedAt": "2024-01-01T00:00:00.000Z",
  "status": "completed",
  "assessmentType": "call_center_interview",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Step 4: Test the Application

1. **Start the application**:
   ```bash
   npm run dev:full
   ```

2. **Open browser**: http://localhost:5173

3. **Test user registration**:
   - Enter name and email
   - Click "Begin Test"
   - Check Firebase Console → Firestore Database → users collection

4. **Test assessment flow**:
   - Complete the assessment
   - Check Firebase Console → Firestore Database → assessments collection

## Step 5: View Data in Firebase Console

### To view users:
1. Go to Firebase Console → Firestore Database
2. Click on "users" collection
3. You'll see all registered users with their details

### To view assessment results:
1. Go to Firebase Console → Firestore Database
2. Click on "assessments" collection
3. You'll see all completed assessments with scores

## Troubleshooting

### Common Issues:

1. **"Permission denied" error**:
   - Make sure Firestore security rules are deployed
   - Check that rules allow read/write access

2. **"Database not found" error**:
   - Ensure Firestore Database is created in your project
   - Check that you're using the correct project ID

3. **"Network error"**:
   - Check your internet connection
   - Verify Firebase project settings
   - Check browser console for specific error messages

### Debug Steps:

1. **Check browser console** for Firebase errors
2. **Verify Firebase configuration** in `src/firebase.js`
3. **Test Firebase connection** by adding a test document
4. **Check network tab** for failed requests

## Production Considerations

For production deployment:

1. **Update security rules** to be more restrictive
2. **Enable Firebase Authentication** for user management
3. **Set up proper indexes** for queries
4. **Configure backup and monitoring**
5. **Set up proper error handling and logging**

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify Firebase project settings
3. Test with a simple Firebase operation
4. Check Firebase Console for any error logs 