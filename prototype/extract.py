import os
import shutil
import json

SOURCE_DIR = r"E:\IPD\educhem_test\train"
DEST_DIR = "./canvas_subset"
NUM_SAMPLES = 100

os.makedirs(DEST_DIR, exist_ok=True)
manifest_path = os.path.join(DEST_DIR, "progress_manifest.json")

valid_pairs = []

# Using sorted() ensures you scan through the files in a predictable, linear order
for fn in sorted(os.listdir(SOURCE_DIR)):
    if fn.endswith(".json"):
        json_path = os.path.join(SOURCE_DIR, fn)
        jpg_path = os.path.join(SOURCE_DIR, fn.replace(".json", ".jpg"))
        
        if not os.path.exists(jpg_path):
            continue
            
        with open(json_path, "r", encoding="utf-8") as f:
            toks = json.load(f).get("ssml_sd", "").split()
            
            # Filter out your specific reaction syntax
            has_reaction = any("rightarrow" in t or t == "+" for t in toks)
            
            # If it's not a reaction, add it (rings are now allowed)
            if not has_reaction:
                valid_pairs.append((json_path, jpg_path))
                
                # Stop scanning as soon as we hit the target limit
                if len(valid_pairs) >= NUM_SAMPLES:
                    break

if len(valid_pairs) > 0:
    manifest = {}
    
    for j_path, i_path in valid_pairs:
        shutil.copy(j_path, DEST_DIR)
        shutil.copy(i_path, DEST_DIR)
        
        filename = os.path.basename(j_path)
        manifest[filename] = False

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=4)
        
    print(f"Successfully copied {len(valid_pairs)} structures to {DEST_DIR}")
    print(f"Tracking file created at: {manifest_path}")
    
    if len(valid_pairs) < NUM_SAMPLES:
        print(f"Note: Only found {len(valid_pairs)} valid pairs in the entire folder.")
else:
    print("No valid structures found in the source directory.")