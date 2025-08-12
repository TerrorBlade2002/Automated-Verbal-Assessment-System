# FFmpeg Setup Guide for Windows

The audio processing system requires FFmpeg to standardize audio files before sending them to the SpeechSuper API.

## Installing FFmpeg on Windows

### Option 1: Download and Install Manually

1. **Download FFmpeg**:
   - Go to https://ffmpeg.org/download.html
   - Click on "Windows" and select "Windows builds by BtbN"
   - Download the latest release (e.g., `ffmpeg-master-latest-win64-gpl.zip`)

2. **Extract and Install**:
   - Extract the ZIP file to `C:\ffmpeg\`
   - The folder structure should be: `C:\ffmpeg\bin\ffmpeg.exe`

3. **Add to PATH**:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables"
   - Under "System Variables", find and select "Path", click "Edit"
   - Click "New" and add `C:\ffmpeg\bin`
   - Click "OK" on all dialogs

4. **Verify Installation**:
   ```cmd
   ffmpeg -version
   ```

### Option 2: Using Package Manager (Recommended)

1. **Install Chocolatey** (if not already installed):
   - Open PowerShell as Administrator
   - Run: `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`

2. **Install FFmpeg**:
   ```cmd
   choco install ffmpeg
   ```

3. **Verify Installation**:
   ```cmd
   ffmpeg -version
   ```

## Audio Processing Requirements

The system automatically converts audio to meet SpeechSuper API requirements:

- **Format**: WAV (PCM 16-bit)
- **Sample Rate**: 16,000 Hz
- **Channels**: Mono (1 channel)
- **Bitrate**: Minimum 96 kbps

### FFmpeg Command Used

```bash
ffmpeg -i input.mp3 -acodec pcm_s16le -ac 1 -ar 16000 -f wav output.wav
```

## Troubleshooting

### FFmpeg Not Found Error
If you see `[WinError 2] The system cannot find the file specified`:

1. Verify FFmpeg is installed: `ffmpeg -version`
2. Check PATH environment variable includes FFmpeg directory
3. Restart your terminal/command prompt
4. Restart the backend server

### Audio Conversion Fails
If audio conversion fails:

1. Check the input audio file is not corrupted
2. Ensure the input audio format is supported (wav, mp3, opus, ogg, amr)
3. Check FFmpeg logs in the backend console

### Alternative Solutions

If FFmpeg installation is problematic, the system will:
1. Attempt to use the original audio file
2. Log warnings about the standardization failure
3. Continue with the SpeechSuper API call

However, for best results, proper FFmpeg installation is recommended.

