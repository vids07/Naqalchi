import os
import base64
import json
import sys
import requests

def load_env():
    """Loads environment variables from .env file."""
    if os.path.exists(".env"):
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

def main():
    # Load env variables
    load_env()
    
    # Retrieve the API key
    api_key = os.getenv("GOOGLE_TTS_API_KEY")
    if not api_key:
        print("Error: GOOGLE_TTS_API_KEY not found in .env file or environment.")
        sys.exit(1)
    
    # Define file paths
    reference_path = "reference.wav"
    consent_path = "consent.wav"
    
    # Verify both files exist
    missing_files = []
    if not os.path.exists(reference_path):
        missing_files.append(reference_path)
    if not os.path.exists(consent_path):
        missing_files.append(consent_path)
        
    if missing_files:
        print(f"Error: Missing required audio file(s): {', '.join(missing_files)}")
        print("Please place real audio recordings of 'reference.wav' and 'consent.wav' in the project root before running.")
        sys.exit(1)
        
    print(f"Loading '{reference_path}'...")
    with open(reference_path, "rb") as f:
        reference_bytes = f.read()
        
    print(f"Loading '{consent_path}'...")
    with open(consent_path, "rb") as f:
        consent_bytes = f.read()
        
    # Base64 encode the audio files
    reference_b64 = base64.b64encode(reference_bytes).decode("utf-8")
    consent_b64 = base64.b64encode(consent_bytes).decode("utf-8")
    
    print("Preparing request to Google Cloud Text-to-Speech v1beta1 API...")
    
    # API URL targeting v1beta1 voices:generateVoiceCloningKey
    # Google API key is supplied as a query parameter
    url = f"https://texttospeech.googleapis.com/v1beta1/voices:generateVoiceCloningKey?key={api_key}"
    
    headers = {
        "Content-Type": "application/json; charset=utf-8"
    }
    
    # The consent script must match Google's required text exactly
    consent_script = "I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model."
    
    payload = {
        "reference_audio": {
            "audio_config": {
                "audio_encoding": "LINEAR16"
            },
            "content": reference_b64
        },
        "voice_talent_consent": {
            "audio_config": {
                "audio_encoding": "LINEAR16"
            },
            "content": consent_b64
        },
        "consent_script": consent_script,
        "language_code": "en-US"
    }
    
    try:
        print("Sending POST request to generateVoiceCloningKey...")
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 200:
            response_data = response.json()
            voice_cloning_key = response_data.get("voiceCloningKey")
            if voice_cloning_key:
                print("\n=========================================")
                print("SUCCESS: Voice Cloning Key Generated!")
                print("=========================================")
                print(voice_cloning_key)
                print("=========================================\n")
            else:
                print("\nWARNING: API returned 200 OK, but 'voiceCloningKey' was not found in response JSON:")
                print(json.dumps(response_data, indent=2))
        else:
            print(f"\nAPI Error: HTTP Status {response.status_code}")
            try:
                error_details = response.json()
                print("Error Response:")
                print(json.dumps(error_details, indent=2))
            except ValueError:
                print("Raw Error Content:")
                print(response.text)
                
    except Exception as e:
        print(f"\nAn error occurred while making the network request: {e}")

if __name__ == "__main__":
    main()
