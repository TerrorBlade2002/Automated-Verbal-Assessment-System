#!/usr/bin/env python3
"""
Setup script for the Verbal Test API Backend
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_dependencies():
    """Check if required dependencies are available"""
    print("🔍 Checking dependencies...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Check if ffmpeg is available
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        print("✅ FFmpeg is available")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  FFmpeg not found. Audio conversion may not work properly.")
        print("   Install FFmpeg: https://ffmpeg.org/download.html")
    
    return True

def install_requirements():
    """Install Python requirements"""
    if not os.path.exists("requirements.txt"):
        print("❌ requirements.txt not found")
        return False
    
    return run_command(
        f"{sys.executable} -m pip install -r requirements.txt",
        "Installing Python requirements"
    )

def setup_firebase():
    """Setup Firebase configuration"""
    print("\n🔥 Setting up Firebase...")
    
    service_key_path = "serviceAccountKey.json"
    if not os.path.exists(service_key_path):
        print(f"⚠️  Firebase service account key not found at {service_key_path}")
        print("   You can:")
        print("   1. Place your Firebase service account key at 'serviceAccountKey.json'")
        print("   2. Or set up Firebase emulator for local development")
        print("   3. Or use default credentials in production environment")
    else:
        print(f"✅ Firebase service account key found at {service_key_path}")
    
    return True

def create_env_file():
    """Create environment file template"""
    env_file = ".env"
    if not os.path.exists(env_file):
        print(f"\n📝 Creating {env_file} template...")
        env_content = """# Environment variables for Verbal Test API

# Development settings
DEBUG=true
PORT=3001

# SpeechSuper API settings
SPEECHSUPER_APP_KEY=os.getenv("SPEECHSUPER_APP_KEY", "")
SPEECHSUPER_SECRET_KEY=os.getenv("SPEECHSUPER_SECRET_KEY", "")

# Firebase settings (optional - uses serviceAccountKey.json if available)
# GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json

# CORS settings
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
"""
        with open(env_file, 'w') as f:
            f.write(env_content)
        print(f"✅ Created {env_file} template")
    else:
        print(f"✅ {env_file} already exists")
    
    return True

def main():
    """Main setup function"""
    print("🚀 Setting up Verbal Test API Backend with SpeechSuper Integration")
    print("=" * 60)
    
    # Change to backend directory if needed
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    print(f"📁 Working directory: {os.getcwd()}")
    
    success = True
    
    # Check dependencies
    if not check_dependencies():
        success = False
    
    # Install requirements
    if not install_requirements():
        success = False
    
    # Setup Firebase
    if not setup_firebase():
        success = False
    
    # Create environment file
    if not create_env_file():
        success = False
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Setup completed successfully!")
        print("\n📋 Next steps:")
        print("1. Place your Firebase service account key at 'serviceAccountKey.json' (optional)")
        print("2. Install FFmpeg if not already available")
        print("3. Run the server: python main.py")
        print("4. Test the API: http://localhost:3001/api/health")
        print("5. View API docs: http://localhost:3001/docs")
    else:
        print("❌ Setup completed with errors. Please check the output above.")
    
    print("\n🔗 Useful links:")
    print("- SpeechSuper API docs: https://docs.speechsuper.com/")
    print("- FastAPI docs: https://fastapi.tiangolo.com/")
    print("- Firebase docs: https://firebase.google.com/docs/")

if __name__ == "__main__":
    main()

