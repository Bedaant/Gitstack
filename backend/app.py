import sys
import os
import uvicorn

print("--- [DEBUG] GITSTACK BOOT SEQUENCE STARTING ---")

try:
    print(f"--- [DEBUG] Current Directory: {os.getcwd()}")
    print(f"--- [DEBUG] Files in dir: {os.listdir('.')}")
    
    print("--- [DEBUG] Importing server.py...")
    from server import app
    print("--- [DEBUG] Import successful! Starting Uvicorn...")
    
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)

except Exception as e:
    print("\n" + "="*50)
    print("💥 CRITICAL BOOT FAILURE 💥")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Message: {str(e)}")
    print("="*50)
    import traceback
    traceback.print_exc()
    sys.exit(1)
