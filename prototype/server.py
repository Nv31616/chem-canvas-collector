from flask import Flask, request, jsonify, send_file
import os
import base64
import json

app = Flask(__name__)

DEST_DIR = "./canvas_subset"
MANIFEST_PATH = os.path.join(DEST_DIR, "progress_manifest.json")

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/api/queue')
def get_queue():
    # Read the central tracking file
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    
    # Filter for files that have not been drawn yet
    pending = [filename for filename, is_drawn in manifest.items() if not is_drawn]
    
    return jsonify({
        "queue": sorted(pending),
        "total_count": len(manifest),
        "completed_count": len(manifest) - len(pending)
    })

@app.route('/api/reference/<filename>')
def get_reference(filename):
    img_name = filename.replace('.json', '.jpg')
    return send_file(os.path.join(DEST_DIR, img_name))

@app.route('/api/save', methods=['POST'])
def save_image():
    data = request.json
    json_filename = data['filename']
    png_filename = json_filename.replace('.json', '.png')
    img_data = base64.b64decode(data['image'].split(',')[1]) 
    
    # 1. Save the drawn image
    with open(os.path.join(DEST_DIR, png_filename), "wb") as f:
        f.write(img_data)
        
    # 2. Update the tracking JSON
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    manifest[json_filename] = True
    
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=4)
        
    return jsonify({"status": "success"})

@app.route('/api/skip', methods=['POST'])
def skip_image():
    data = request.json
    json_filename = data['filename']
    
    # Update the tracking JSON to mark it as skipped
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    manifest[json_filename] = "skipped"
    
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=4)
        
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)