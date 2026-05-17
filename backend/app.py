import sys
import os
import uvicorn

print("--- [GITSTACK PRODUCTION BOOT] ---")

try:
    from server import app
    port = int(os.environ.get("PORT", 10000))
    print(f"[OK] Application ready. Binding to port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

except Exception as e:
    print(f"[ERROR] BOOT FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
