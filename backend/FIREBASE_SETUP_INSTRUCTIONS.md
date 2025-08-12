# Firebase Setup Instructions

## Option 1: Service Account Key (Recommended for Development)

1. **Generate Firebase Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `verbal-test-c52b4`
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Rename it to `serviceAccountKey.json`
   - Place it in the `backend/` directory

2. **Security Note:**
   - Add `serviceAccountKey.json` to `.gitignore`
   - Never commit this file to version control

## Option 2: Use Frontend Firebase Config (Temporary Solution)

Since your frontend already has Firebase configured, we can use the existing client-side configuration for now.

## Option 3: Firebase Emulator (Local Development)

```bash
npm install -g firebase-tools
firebase login
firebase init emulators
firebase emulators:start --only firestore
```

## Current Status

The backend will work with mock responses until Firebase is properly configured.
All SpeechSuper API functionality works independently of Firebase setup.

