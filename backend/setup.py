#!/usr/bin/env python3
"""
Setup script for Verbal Test App Backend
"""
import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"   Error output: {e.stderr}")
        return False
    except Exception as e:
        print(f"❌ {description} failed with unexpected error: {e}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    print("🔍 Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python {version.major}.{version.minor} is not supported. Please use Python 3.8 or higher.")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing Python dependencies...")
    requirements_file = Path("requirements.txt")
    
    if not requirements_file.exists():
        print("❌ requirements.txt not found in current directory")
        return False
    
    return run_command("pip install -r requirements.txt", "Installing dependencies")

def check_ffmpeg():
    """Check if FFmpeg is available"""
    print("🔍 Checking FFmpeg installation...")
    
    # Try different ffmpeg executable names for Windows compatibility
    ffmpeg_executables = ['ffmpeg', 'ffmpeg.exe']
    
    for exe in ffmpeg_executables:
        try:
            result = subprocess.run([exe, '-version'], capture_output=True, timeout=5)
            if result.returncode == 0:
                print(f"✅ FFmpeg found: {exe}")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            continue
    
    print("❌ FFmpeg not found. Please install FFmpeg:")
    print("   Windows: Use Chocolatey (choco install ffmpeg) or download from ffmpeg.org")
    print("   macOS: brew install ffmpeg")
    print("   Linux: sudo apt install ffmpeg (Ubuntu/Debian)")
    return False

def setup_firebase():
    """Setup Firebase configuration"""
    print("🔥 Setting up Firebase...")
    
    service_key_path = "serviceAccountKey.json"
    
    if Path(service_key_path).exists():
        print("✅ Firebase service account key found")
        return True
    else:
        print("⚠️  Firebase service account key not found")
        print("   1. Place your Firebase service account key at 'serviceAccountKey.json'")
        print("   2. Or use Firebase emulator for local development")
        return False

def create_env_file():
    """Create .env file with configuration"""
    print("📝 Creating environment configuration...")
    
    env_content = f"""# Backend Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173

# SpeechSuper API credentials (already configured in code)
SPEECHSUPER_APP_KEY=17467708300004bd
SPEECHSUPER_SECRET_KEY=82a4235f5f2f9932c5511703fb84dad6

# Firebase settings (optional - uses serviceAccountKey.json if available)
# GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json

# Logging
LOG_LEVEL=INFO
"""
    
    env_file = Path(".env")
    if env_file.exists():
        print("⚠️  .env file already exists, skipping creation")
        return True
    
    try:
        with open(env_file, 'w') as f:
            f.write(env_content)
        print("✅ .env file created successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to create .env file: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up Verbal Test App Backend...")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Check FFmpeg
    if not check_ffmpeg():
        print("⚠️  FFmpeg is required for audio processing. Setup will continue but audio features may not work.")
    
    # Setup Firebase
    setup_firebase()
    
    # Create environment file
    create_env_file()
    
    print("=" * 50)
    print("✅ Backend setup completed!")
    print("📋 Next steps:")
    print("1. Place your Firebase service account key at 'serviceAccountKey.json' (optional)")
    print("2. Run the backend: python main.py")
    print("3. Or use: npm run dev:server (from project root)")
    
    return True

if __name__ == "__main__":
    main()

