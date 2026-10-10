### The Project Pitch

**What we are building:** A crowdsourced data collection web app called the "Chemical Canvas Crowdsourcer." 
**The Problem:** We have an AI model trained to recognize chemical structures on paper, but it struggles with the visual style of digital tablet handwriting. **The Solution:** We are building a MERN-stack web platform that serves reference images of chemical structures. Users trace or redraw these structures on their tablets using a stylus. The app captures these digital drawings, saves them to cloud storage, and links them to the existing chemical labels for model fine-tuning. 
**Key Features:**

- A smart queue system in MongoDB that locks images to prevent two teammates from drawing the same structure simultaneously.
    
- An interactive drawing board using a pre-built React library, providing native support for stylus input, erasing, and pinch-to-zoom navigation.
    
- Scalable cloud object storage to handle gigabytes of image data for free.
    

## Workflow Diagram
![[Pasted image 20261010215534.png]]

### The Tech Stack

- **MongoDB Atlas (Database):** Stores our `ImageQueue` collection. It tracks the dataset state (e.g., `filename`, `status: 'pending' | 'drawn'`, and `locked_until` timestamps).
    
- **Express & Node.js (Backend):** Serves the API endpoints. It handles the database locking logic and securely proxies image uploads to our cloud bucket.
    
- **React & `@excalidraw/excalidraw` (Frontend):** We are using Excalidraw's official React package. Instead of manually coding HTML5 canvas logic for Android touch events, Excalidraw gives us a production-ready whiteboard out of the box. It natively handles smooth stylus drawing, eraser tools, and two-finger panning/zooming.
    
- **DigitalOcean Spaces (Object Storage):** Since MongoDB cannot store gigabytes of images, we are using DigitalOcean Spaces (which is fully covered by our GitHub Student Developer Pack credits). It acts exactly like an AWS S3 bucket, storing our reference `.jpg` files and saving the final `.png` drawings.

## Roles for each team member

| **Role**                        | **Responsibilities**                                                                                                                                                                                    | **Account / Credits Used**           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **1. Cloud & Infrastructure**   | Set up DigitalOcean Spaces. Configure CORS for the bucket. Write the AWS S3 SDK utility functions (`uploadToSpaces`) for the backend.                                                                   | Teammate 1's DigitalOcean Credits    |
| **2. Database & Data Pipeline** | Set up MongoDB Atlas. Write the `ImageQueue.js` Mongoose schema. Develop the `seed.js` script to filter the dataset and upload the reference images.                                                    | Teammate 2's MongoDB Atlas Free Tier |
| **3. Backend API Server**       | Build the Express `server.js`. Implement the concurrency locking logic (`findOneAndUpdate`). Connect the S3 utility and Mongoose models to the `/queue`, `/save`, and `/skip` routes. Deploy to Render. | Teammate 3's Render Account          |
| **4. Frontend & Canvas UI**     | Initialize the React app. Integrate `@excalidraw/excalidraw`. Build the UI controls and wire up the `fetch` calls to the backend API. Deploy to Vercel.                                                 | Teammate 4's Vercel Account          |
Here are the updated prompts for each teammate. They now explicitly instruct Claude to read your attached Python/HTML prototype files and translate that exact logic into the MERN architecture.
  

When your teammates use these, remind them to attach `server.py`, `extract.py`, `index.html`, and `manifest.json` (along with a sample image/label) directly to the prompt.

### Teammate 1: Infrastructure & Storage Lead

Plaintext

```
Act as a Cloud & DevOps Engineer working on a MERN stack project. I am setting up DigitalOcean Spaces (S3-compatible object storage) using Node.js to host a crowdsourced dataset of chemical structures.

Project Context:
I have attached my team's local prototype files (`server.py`, `extract.py`) to show you how we currently handle local file saving. We are scaling this to a cloud architecture. We need a secure, modular storage utility file (`backend/utils/s3Client.js`) that replaces our local `os` file operations by handling S3 bucket uploads and file routing.

Tech Stack:
- Node.js
- AWS SDK v3 (`@aws-sdk/client-s3`)
- DigitalOcean Spaces

Your Task:
Provide the complete code for `backend/utils/s3Client.js`.
1. Initialize and export an `S3Client` configured for DigitalOcean Spaces using environment variables (`DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_ENDPOINT`, `DO_SPACES_REGION`).
2. Write and export `uploadFile(buffer, fileName, bucketName, contentType)` to upload a file and return its public URL.
3. Write and export `copyFile(sourceBucket, targetBucket, fileName)` to duplicate an existing file (specifically for moving `.json` labels from our reference bucket to our final dataset bucket when a drawing is completed).
4. Provide a sample `.env.example` file.
```

### Teammate 2: Database & Data Pipeline Lead

Plaintext

```
Act as a Database Engineer working on a MERN stack project. I am responsible for setting up MongoDB Atlas with Mongoose and writing the initial data ingestion script (`seed.js`).

Project Context:
I have attached our local data extraction script (`extract.py`) and our state tracker (`manifest.json`). Please analyze how `extract.py` filters out chemical reactions using token matching, and how `manifest.json` tracks file statuses. 

Tech Stack:
- MongoDB Atlas & Mongoose
- Node.js
- DigitalOcean Spaces (via `@aws-sdk/client-s3`)

Your Task:
Translate the logic from `extract.py` and `manifest.json` into the following production files:

1. `backend/models/ImageQueue.js`:
   - Replace the `manifest.json` concept with a Mongoose Schema for `ImageQueue`. 
   - Fields: `filename` (String, required, unique), `status` (String, enum: ['pending', 'drawn', 'skipped'], default: 'pending'), `locked_until` (Date, default: null).

2. `backend/seed.js`:
   - Translate the logic of `extract.py` into Node.js.
   - Connect to MongoDB Atlas.
   - Read a local folder of `.json` and `.jpg` files.
   - Implement the exact same token-filtering logic found in `extract.py` to exclude reactions.
   - For every valid pair:
     a) Upload the `.jpg` reference image AND the `.json` label file to DigitalOcean Spaces bucket `reference-images`.
     b) Save an entry in MongoDB `ImageQueue` with `status: 'pending'`.
```

### Teammate 3: Backend API Developer

Plaintext

```
Act as a Backend Engineer working on a MERN stack project. I am responsible for building the Express REST API (`backend/server.js`) to handle image distribution and submission with concurrency locking.

Project Context:
I have attached our local Flask prototype (`server.py`) and `manifest.json`. Please analyze how the `/api/queue`, `/api/save`, and `/api/skip` routes currently interact with the local filesystem and the JSON manifest. 

Tech Stack:
- Node.js & Express
- MongoDB Atlas & Mongoose
- DigitalOcean Spaces (via `@aws-sdk/client-s3`)

Your Task:
Translate the Flask logic in `server.py` into a robust Express API with the following endpoints:

1. `GET /api/queue`:
   - Replace the local manifest check with a MongoDB `findOneAndUpdate` call.
   - Atomically find ONE document in `ImageQueue` where `status = 'pending'` AND (`locked_until` is null OR `locked_until` < now).
   - Set `locked_until` to 5 minutes in the future (to prevent teammate overlap).
   - Return the `filename` and the public URL of the reference image.

2. `POST /api/save`:
   - Accept a base64 PNG string and `filename` in the body.
   - Replace the local `os.write` logic by uploading the PNG to DigitalOcean Spaces bucket `canvas-dataset`.
   - Use the S3 client to copy the matching `.json` file from the `reference-images` bucket to the `canvas-dataset` bucket.
   - Update the MongoDB `ImageQueue` document status to `'drawn'` and reset `locked_until` to null.

3. `POST /api/skip`:
   - Accept `filename`, update the DB status to `'skipped'`, and reset `locked_until`.
```

### Teammate 4: Frontend UI Lead

Plaintext

```
Act as a Frontend Developer working on a MERN stack project. I am responsible for building the React client (`frontend/src/App.jsx`) for our chemical structure collection tool.

Project Context:
I have attached our local prototype (`index.html`) which uses vanilla HTML5 Canvas and custom multi-touch gesture logic. Please analyze the UI layout, the fetch calls, and the counter logic. We are migrating this to React using the `@excalidraw/excalidraw` library, which will handle the canvas and touch optimizations natively.

Tech Stack:
- React (Vite)
- `@excalidraw/excalidraw`
- CSS / Tailwind CSS

Your Task:
Translate the logic from `index.html` into `frontend/src/App.jsx`:

1. On mount, fetch the current pending image from `GET /api/queue` (replicating the `fetch('/api/queue')` logic).
2. Display a top header bar replicating the old toolbar:
   - Progress info / file name.
   - The reference `.jpg` image (loaded via public URL from DigitalOcean Spaces).
   - A **Skip** button (triggers `POST /api/skip` and loads next image).
   - A **Save & Next** button.
3. Embed the `<Excalidraw />` canvas below the toolbar.
4. When **Save & Next** is clicked:
   - Use Excalidraw's `exportToBlob` utility to render the current drawing as a PNG blob.
   - Convert the blob to a base64 string.
   - Send it via `POST /api/save` (replicating the old `saveAndNext()` function).
   - Clear the Excalidraw scene and automatically fetch the next item.
5. Handle empty queue states gracefully when all images are completed.
```

