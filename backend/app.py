import os
import sys

print("\n" + "="*50)
print("📂 DIRECTORY AUDIT START")
print(f"Current Path: {os.getcwd()}")
try:
    print(f"Directory Contents: {os.listdir('.')}")
except Exception as e:
    print(f"Error listing dir: {e}")

print("\n📦 CHECKING IMPORTS")
try:
    import fastapi
    print("✅ FastAPI is installed")
    import motor
    print("✅ Motor is installed")
    import server
    print("✅ server.py was found and imported!")
except Exception as e:
    print(f"❌ IMPORT ERROR: {e}")
    import traceback
    traceback.print_exc()

print("="*50 + "\n")
sys.exit(0) # Exit with 0 so Render sees it as a "success" for this test
