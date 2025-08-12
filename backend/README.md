# Verbal Test API Backend

A FastAPI backend for automated verbal/spoken English communication testing using SpeechSuper API integration.

## Features

- 🎤 **SpeechSuper API Integration**: Professional speech assessment using `asr.eval` core type
- 🔥 **Firebase/Firestore**: Secure data storage for assessment results
- 🎵 **Audio Processing**: Automatic audio standardization using FFmpeg
- 🔒 **Secure Authentication**: SHA1 signature-based authentication for SpeechSuper API
- 📊 **Comprehensive Scoring**: Overall, pronunciation, fluency, rhythm, and integrity scores
- 🚀 **FastAPI**: Modern, fast, and auto-documented API
- 📝 **Structured Storage**: Question-by-question assessment result storage

## Quick Start

### Prerequisites

- Python 3.8+
- FFmpeg (for audio processing)
- Firebase project (optional for local development)

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Run the setup script**
   ```bash
   python setup.py
   ```

3. **Start the server**
   ```bash
   python main.py
   ```

4. **Test the API**
   - Health check: http://localhost:3001/api/health
   - API documentation: http://localhost:3001/docs
   - Test SpeechSuper connection: http://localhost:3001/api/test-speechsuper

## API Endpoints

### Core Endpoints

- `POST /api/speechsuper` - Analyze speech using SpeechSuper API
- `GET /api/health` - Health check and configuration status
- `GET /api/assessment/{assessment_id}/results` - Get assessment results
- `POST /api/assessment/{assessment_id}/complete` - Mark assessment as completed
- `GET /api/test-speechsuper` - Test SpeechSuper API connection

### Speech Analysis Request

```bash
curl -X POST "http://localhost:3001/api/speechsuper" \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@recording.wav" \
  -F "user_id=user123" \
  -F "question_id=q1" \
  -F "assessment_id=assessment123"
```

### Response Structure

```json
{
  "success": true,
  "token_id": "assessment123_q1_1640995200",
  "user_id": "user123",
  "question_id": "q1",
  "assessment_id": "assessment123",
  "timestamp": "2021-12-31T12:00:00",
  "scores": {
    "overall": 85,
    "pronunciation": 82,
    "fluency": 88,
    "rhythm": 86,
    "integrity": 100,
    "speed": 120
  },
  "transcription": "Hello world. This is a test recording.",
  "duration": 3.5,
  "pause_count": 2,
  "word_count": 8,
  "stored_in_database": true,
  "speechsuper_response": { /* Full SpeechSuper API response */ }
}
```

## SpeechSuper API Configuration

### Credentials (Pre-configured)
- **App Key**: `YOUR_SPEECHSUPER_APP_KEY`
- **Secret Key**: `YOUR_SPEECHSUPER_SECRET_KEY`
- **Core Type**: `asr.eval` (unscripted general speech assessment)
- **Model**: `non_native` (optimized for non-native English speakers)

### Audio Requirements
- **Formats**: WAV, MP3, OPUS, OGG, AMR
- **Channel**: Mono (1 channel)
- **Sample Rate**: 16000 Hz
- **Bitrate**: At least 96 kbps
- **Duration**: Up to 290 seconds (~5 minutes)

### Audio Processing
The backend automatically standardizes audio using FFmpeg:
```bash
ffmpeg -i input.mp3 -acodec pcm_s16le -ac 1 -ar 16000 output.wav
```

## Database Schema

### Assessment Document Structure
```
assessments/{assessment_id}
├── user_id: string
├── assessment_id: string
├── created_at: timestamp
├── last_updated: timestamp
├── status: "completed" | "failed"
└── question_results: {
    "q1": {
      "completed": true,
      "scores": {...},
      "timestamp": timestamp
    }
  }
```

### Result Document Structure
```
assessments/{assessment_id}/results/{question_id}
├── user_id: string
├── assessment_id: string
├── question_id: string
├── timestamp: timestamp
├── scores: {
│   ├── overall: number
│   ├── pronunciation: number
│   ├── fluency: number
│   ├── rhythm: number
│   ├── integrity: number
│   └── speed: number
│ }
├── transcription: string
├── duration: number
├── speechsuper_response: object
└── metadata: {
    ├── token_id: string
    ├── word_count: number
    ├── pause_count: number
    └── ...
  }
```

## Firebase Setup

### Option 1: Service Account Key (Recommended for Development)
1. Download your Firebase service account key
2. Save it as `serviceAccountKey.json` in the backend directory
3. The app will automatically use this for authentication

### Option 2: Default Credentials (Production)
- Use Google Cloud default credentials
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### Option 3: Firebase Emulator (Local Development)
```bash
firebase emulators:start --only firestore
```

## Error Handling

The API includes comprehensive error handling:

- **SpeechSuper API failures**: Returns mock response for development
- **Audio processing errors**: Falls back to original audio if FFmpeg fails
- **Database errors**: Continues processing even if storage fails
- **Authentication errors**: Proper HTTP status codes and error messages

## Development Features

- **Auto-generated documentation**: Available at `/docs`
- **Logging**: Comprehensive logging for debugging
- **Mock responses**: Fallback responses when SpeechSuper API is unavailable
- **CORS enabled**: Ready for frontend integration
- **Health checks**: Monitor service status and configuration

## Deployment

### Local Development
```bash
python main.py
```

### Production with Uvicorn
```bash
uvicorn main:app --host 0.0.0.0 --port 3001 --workers 4
```

### Docker (Optional)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 3001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]
```

## Security Considerations

- **Signature-based authentication**: Uses SHA1 signatures as recommended by SpeechSuper
- **Credential protection**: API keys are embedded but can be moved to environment variables
- **Input validation**: File size limits and format validation
- **CORS configuration**: Restricted to development origins by default

## Troubleshooting

### Common Issues

1. **FFmpeg not found**
   - Install FFmpeg: https://ffmpeg.org/download.html
   - Add to PATH or use package manager

2. **Firebase connection errors**
   - Check service account key placement
   - Verify Firebase project configuration
   - Check network connectivity

3. **SpeechSuper API errors**
   - Verify API credentials
   - Check audio format requirements
   - Monitor rate limits

4. **Audio processing failures**
   - Check audio file format and size
   - Verify FFmpeg installation
   - Check file permissions

### Logs
Monitor logs for detailed error information:
```bash
python main.py 2>&1 | tee app.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request

## License

This project is licensed under the MIT License.

