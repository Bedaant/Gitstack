export const MOCK_TRACES = [
  {
    id: "login-endpoint",
    prompt: "Create a Python login endpoint",
    code: `from flask import Flask, request, jsonify
import bcrypt
import jwt
import datetime
from functools import wraps

app = Flask(__name__)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']
    
    user = db.users.find_one({'username': username})
    
    if user and bcrypt.checkpw(password.encode(), user['password']):
        token = jwt.encode({
            'user_id': str(user['_id']),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, os.environ['JWT_SECRET'], algorithm='HS256')
        return jsonify({'token': token})
    return jsonify({'error': 'Invalid credentials'}), 401`,
    goal: "Build a secure login endpoint with password verification and session tokens",
    approach: "Use bcrypt for password hashing (industry standard, slow to brute-force) and JWT for stateless session management",
    overallConfidence: "Medium",
    assumptions: [
      {
        id: "a1",
        text: "Input is already validated (no SQL injection, proper schema)",
        type: "security",
        confidence: "Medium",
        lineNumber: 12,
        whyItMatters: "Without validation, attackers can inject SQL or send malformed payloads. This is the #1 cause of web app breaches.",
        suggestedFix: "Add schema validation with pydantic or marshmallow before processing.",
      },
      {
        id: "a2",
        text: "Database connection (db) is available in scope",
        type: "infra",
        confidence: "High",
        lineNumber: 14,
        whyItMatters: "If db is undefined, this raises NameError and crashes the endpoint. Should inject or import explicitly.",
        suggestedFix: "Pass db as a parameter or import it explicitly from your database module.",
      },
      {
        id: "a3",
        text: "Environment variable JWT_SECRET is set",
        type: "env",
        confidence: "High",
        lineNumber: 18,
        whyItMatters: "If JWT_SECRET is missing, jwt.encode() will fail with a KeyError. Production apps have been breached by hardcoding secrets.",
        suggestedFix: "Add startup validation: assert os.environ.get('JWT_SECRET'), 'JWT_SECRET required'.",
      },
      {
        id: "a4",
        text: "Username exists in request JSON (KeyError won't occur)",
        type: "validation",
        confidence: "Low",
        lineNumber: 12,
        whyItMatters: "data['username'] raises KeyError if the client omits this field. This crashes the endpoint instead of returning a clean 400.",
        suggestedFix: "Use data.get('username') and return 400 if None.",
      },
    ]
  },
  {
    id: "file-upload",
    prompt: "Build a file upload handler",
    code: `@app.route('/api/upload', methods=['POST'])
def upload_file():
    file = request.files['document']
    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    return jsonify({'url': f'/uploads/{filename}'})`,
    goal: "Accept file uploads and store them safely",
    approach: "Use Flask's request.files with secure_filename to prevent directory traversal",
    overallConfidence: "Low",
    assumptions: [
      {
        id: "b1",
        text: "UPLOAD_FOLDER environment variable is configured",
        type: "env",
        confidence: "High",
        lineNumber: 5,
        whyItMatters: "If UPLOAD_FOLDER is unset, os.path.join() may fail or write to an unexpected location.",
        suggestedFix: "Add validation at startup: UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', '/tmp/uploads')",
      },
      {
        id: "b2",
        text: "File size is reasonable (not a DDoS vector)",
        type: "security",
        confidence: "Low",
        lineNumber: 5,
        whyItMatters: "Without size limits, a single attacker can exhaust disk space by uploading multi-GB files repeatedly.",
        suggestedFix: "Add MAX_CONTENT_LENGTH = 16 * 1024 * 1024 to Flask config.",
      },
      {
        id: "b3",
        text: "User is authenticated before reaching this handler",
        type: "security",
        confidence: "Medium",
        lineNumber: 3,
        whyItMatters: "Anonymous uploads allow anyone to store arbitrary files on your server, including malware.",
        suggestedFix: "Add @require_auth decorator or check session before processing.",
      },
      {
        id: "b4",
        text: "File content is safe (no malware scanning)",
        type: "security",
        confidence: "Low",
        lineNumber: 5,
        whyItMatters: "Users can upload executable files, scripts, or malware that other users later download.",
        suggestedFix: "Scan with ClamAV or restrict allowed extensions (e.g. only .pdf, .docx).",
      },
    ]
  },
  {
    id: "data-export",
    prompt: "Export user data as CSV",
    code: `import csv
import io

@app.route('/api/export', methods=['GET'])
def export_users():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'email', 'created_at'])
    
    for user in db.users.find():
        writer.writerow([user['_id'], user['email'], user['created_at']])
    
    return output.getvalue(), 200, {'Content-Type': 'text/csv'}`,
    goal: "Allow admins to export user data",
    approach: "Stream MongoDB cursor to CSV in memory, return as plain text response",
    overallConfidence: "High",
    assumptions: [
      {
        id: "c1",
        text: "User has admin privileges (no role check shown)",
        type: "security",
        confidence: "Medium",
        lineNumber: 6,
        whyItMatters: "Any authenticated (or unauthenticated) user can dump your entire user database including emails.",
        suggestedFix: "Add @require_admin decorator before the route.",
      },
      {
        id: "c2",
        text: "Dataset fits in memory (no pagination)",
        type: "perf",
        confidence: "High",
        lineNumber: 9,
        whyItMatters: "With 100k+ users, StringIO holds everything in RAM. This can OOM-kill your server.",
        suggestedFix: "Use StreamingResponse or yield chunks instead of buffering entire CSV.",
      },
    ]
  }
];
