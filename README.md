# Verbal Test App - Call Center Assessment System

A comprehensive call center interview assessment system with AI-powered English speech evaluation using SpeechSuper API. The system evaluates candidates through voice recordings and provides detailed scoring on pronunciation, fluency, clarity, and confidence.

## Features

- **User Authentication**: Secure registration with name and email validation
- **Call Center Assessment**: 3-question interview with voice recording
- **AI Speech Evaluation**: Integration with SpeechSuper API for English proficiency scoring
- **Real-time Recording**: Audio recording with timer and playback
- **Results Storage**: Firebase integration for storing assessment results
- **Modern UI**: Beautiful, responsive design with Tailwind CSS v4

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4
- **Backend**: FastAPI (Python), Uvicorn
- **Database**: Firebase Firestore
- **Speech API**: SpeechSuper API
- **Audio Processing**: FFmpeg, Web Audio API, MediaRecorder

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### System Requirements
- **Operating System**: Windows 10/11, macOS, or Linux
- **Python**: 3.8 or higher
- **Node.js**: 18.0 or higher
- **npm**: 8.0 or higher
- **Git**: Latest version

### Required Software
- **FFmpeg**: For audio processing (see FFmpeg Setup section below)
- **Firebase CLI** (optional): For Firebase emulator setup

## Complete Setup Guide

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/verbal-test-app.git

# Navigate to the project directory
cd verbal-test-app
```

### Step 2: Frontend Setup

```bash
# Install Node.js dependencies
npm install

# Verify installation
npm run lint
```

### Step 3: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Return to root directory
cd ..
```

### Step 4: FFmpeg Installation

The backend requires FFmpeg for audio processing. Follow the appropriate installation method for your operating system:

#### Windows Installation

**Option 1: Using Chocolatey (Recommended)**
```powershell
# Install Chocolatey (run PowerShell as Administrator)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install FFmpeg
choco install ffmpeg
```

**Option 2: Manual Installation**
1. Download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg\`
3. Add `C:\ffmpeg\bin` to your system PATH
4. Restart your terminal

#### macOS Installation

```bash
# Using Homebrew
brew install ffmpeg

# Verify installation
ffmpeg -version
```

#### Linux Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# Verify installation
ffmpeg -version
```

### Step 5: Firebase Configuration

#### Option 1: Service Account Key (Recommended for Development)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project or create a new one
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Rename it to `serviceAccountKey.json`
7. Place it in the `backend/` directory

**Important**: Add `serviceAccountKey.json` to your `.gitignore` file to prevent committing sensitive credentials.

#### Option 2: Firebase Emulator (Local Development)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase emulators
firebase init emulators

# Start Firestore emulator
firebase emulators:start --only firestore
```

### Step 6: Environment Configuration

Create a `.env` file in the root directory:

```env
# SpeechSuper API Configuration
SPEECHSUPER_APP_KEY=your_speechsuper_app_key_here
SPEECHSUPER_SECRET_KEY=your_speechsuper_secret_key_here

# Firebase Configuration (if not using service account key)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id

# Backend Configuration
BACKEND_PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Step 7: SpeechSuper API Setup

1. Sign up for a SpeechSuper account at [https://www.speechsuper.com/](https://www.speechsuper.com/)
2. Obtain your App Key and Secret Key from the dashboard
3. Update the `.env` file with your credentials

## Running the Application

### Development Mode (Full Stack)

```bash
# Start both frontend and backend simultaneously
npm run dev:full
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

### Individual Services

```bash
# Frontend only
npm run dev

# Backend only
npm run dev:server

# Backend with health check
npm run backend:health
```

### Production Build

```bash
# Build frontend for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
verbal-test-app/
├── src/                    # Frontend React source code
│   ├── components/        # React components
│   ├── assets/           # Static assets (videos, images)
│   ├── utils/            # Utility functions
│   └── firebase.js       # Firebase configuration
├── backend/               # Python FastAPI backend
│   ├── main.py           # Main FastAPI application
│   ├── firebase_config.py # Firebase integration
│   ├── requirements.txt   # Python dependencies
│   └── serviceAccountKey.json # Firebase credentials
├── public/                # Public static files
├── package.json           # Node.js dependencies
└── vite.config.js         # Vite configuration
```

## API Endpoints

### Health Check
- `GET /api/health` - Backend health status

### SpeechSuper Integration
- `POST /api/speechsuper` - Process audio recordings for evaluation

### Assessment Management
- `POST /api/assessment/result` - Store assessment results
- `GET /api/assessment/results/{user_id}/{assessment_id}` - Retrieve assessment results
- `PUT /api/assessment/status/{assessment_id}` - Update assessment status

## Assessment Flow

1. **User Registration**: Enter name and email
2. **Test Selection**: Choose Call Center Assessment
3. **Guidelines**: Review assessment instructions
4. **Question Recording**: Answer 3 interview questions with voice recordings
5. **Audio Processing**: Backend processes audio using FFmpeg
6. **Speech Evaluation**: Audio sent to SpeechSuper API for scoring
7. **Results Display**: Show pronunciation, fluency, clarity, and confidence scores
8. **Data Storage**: Results saved to Firebase Firestore

## Call Center Questions

1. **Customer Service Scenario**: Handle difficult customer situations
2. **Motivation & Performance**: Maintain high performance during repetitive tasks
3. **Stress Management**: Work under pressure and meet deadlines

## Audio Requirements

- **Supported Formats**: WAV, MP3, Opus, OGG, AMR
- **Channels**: Mono (1 channel)
- **Sample Rate**: 16,000 Hz
- **Bitrate**: Minimum 96 kbps
- **Duration**: Maximum 5 minutes per response
- **Processing**: Automatically converted to WAV format using FFmpeg

## Troubleshooting

### Common Issues

#### FFmpeg Not Found
```bash
# Verify FFmpeg installation
ffmpeg -version

# Check PATH environment variable
echo $PATH  # On Unix/Linux
echo %PATH% # On Windows
```

#### Python Dependencies
```bash
# Ensure virtual environment is activated
# Windows: venv\Scripts\activate
# Unix/Linux: source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

#### Node.js Dependencies
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Firebase Connection Issues
1. Verify `serviceAccountKey.json` is in the `backend/` directory
2. Check Firebase project configuration
3. Ensure Firestore rules allow read/write access
4. Verify network connectivity

#### Audio Recording Issues
1. Check browser microphone permissions
2. Ensure HTTPS is used (required for MediaRecorder API)
3. Test with different browsers (Chrome recommended)
4. Check audio device settings

### Debug Mode

Enable detailed logging:

```bash
# Backend logging
export LOG_LEVEL=DEBUG  # Unix/Linux
set LOG_LEVEL=DEBUG     # Windows

# Frontend debugging
localStorage.setItem('debug', 'true');
```

## Development Notes

### Audio Processing Pipeline
1. Frontend records audio using MediaRecorder API
2. Audio sent to backend as multipart form data
3. Backend uses FFmpeg to convert audio to WAV format
4. Standardized audio sent to SpeechSuper API
5. Results processed and stored in Firebase

### Firebase Integration
- Uses Firebase Admin SDK for backend operations
- Firestore collections: `users`, `assessments`, `assessment_results`
- Real-time updates supported through Firestore listeners

### Security Considerations
- API keys stored in environment variables
- CORS configured for development domains
- File upload size limits enforced
- Input validation on all endpoints
- Firebase security rules should be configured for production

## Production Deployment

### Environment Setup
1. Set all required environment variables
2. Configure production Firebase project
3. Set up proper CORS origins
4. Enable HTTPS for audio transmission

### Audio Processing
1. Ensure FFmpeg is properly installed on production server
2. Configure audio file storage (local or cloud)
3. Implement audio file cleanup policies

### Monitoring & Logging
1. Set up application monitoring
2. Configure error logging and alerting
3. Monitor API rate limits
4. Set up health checks


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For technical support or questions:

1. **Documentation**: Check this README and inline code comments
2. **SpeechSuper API**: Refer to [SpeechSuper documentation](https://www.speechsuper.com/)

## Changelog

### Version 1.0.0
- Initial release with React 19 and FastAPI backend
- SpeechSuper API integration
- Firebase Firestore database
- FFmpeg audio processing
- Complete assessment workflow

---

