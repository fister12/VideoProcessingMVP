import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from pydantic import BaseModel
from workers.tasks import generate_proxy
from workers.tasks import process_edit

class EditRequest(BaseModel):
    filename: str
    edit_type: str
    params: dict

class TimelineRequest(BaseModel):
    clips: list
    output_filename: str

app = FastAPI(title="Video Processing API")

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# These paths are inside the container.
# Docker volumes map them to your local machine.
ORIGINALS_DIR = "/app/uploads/originals"
PROXIES_DIR = "/app/uploads/proxies"
os.makedirs(ORIGINALS_DIR, exist_ok=True)
os.makedirs(PROXIES_DIR, exist_ok=True)

@app.get("/", tags=["Health Check"])
async def root():
    return {"message": "API is running."}

@app.get("/videos/", tags=["Video"])
async def list_videos():
    """List all uploaded original and proxy videos."""
    originals = os.listdir(ORIGINALS_DIR)
    proxies = os.listdir(PROXIES_DIR)
    return {"originals": originals, "proxies": proxies}

@app.get("/download/original/{filename}", tags=["Video"])
async def download_original(filename: str):
    path = os.path.join(ORIGINALS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="video/mp4", filename=filename)

@app.get("/download/proxy/{filename}", tags=["Video"])
async def download_proxy(filename: str):
    path = os.path.join(PROXIES_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="video/mp4", filename=filename)

@app.post("/edit/", status_code=202, tags=["Edit"])
async def submit_edit_job(request: EditRequest):
    """Submit a video edit job (e.g., cut, merge, effect)."""
    original_path = os.path.join(ORIGINALS_DIR, request.filename)
    output_path = os.path.join(PROXIES_DIR, f"edit_{request.filename}")
    task = process_edit.delay(original_path, output_path, request.edit_type, request.params)
    return {"message": "Edit job started.", "task_id": task.id}

@app.post("/process-timeline/", status_code=202, tags=["Edit"])
async def process_timeline(request: TimelineRequest):
    """Process a timeline with multiple clips into a single video."""
    if not request.clips:
        raise HTTPException(status_code=400, detail="No clips provided")
    
    # Prepare segments for concatenation
    segments = []
    for clip in request.clips:
        original_path = os.path.join(ORIGINALS_DIR, clip['videoName'])
        # Create temporary cut files for each segment
        temp_cut_path = os.path.join(PROXIES_DIR, f"temp_cut_{clip['id']}_{clip['videoName']}")
        
        # First, cut each segment
        cut_task = process_edit.delay(
            original_path, 
            temp_cut_path, 
            'cut', 
            {'start': clip['startTime'], 'end': clip['endTime']}
        )
        
        segments.append({'path': temp_cut_path})
    
    # Then concatenate all segments
    output_path = os.path.join(PROXIES_DIR, request.output_filename)
    concat_task = process_edit.delay(
        "", # Not used for concat
        output_path,
        'concat',
        {'segments': segments}
    )
    
    return {"message": "Timeline processing started.", "task_id": concat_task.id}

@app.post("/upload-video/", status_code=202, tags=["Video"])
async def upload_video(file: UploadFile = File(...)):
    """Accepts a video, saves it, and starts proxy generation."""
    try:
        original_path = os.path.join(ORIGINALS_DIR, file.filename)
        proxy_path = os.path.join(PROXIES_DIR, f"proxy_{file.filename}")

        with open(original_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Send the processing job to the Celery worker
        task = generate_proxy.delay(original_path, proxy_path)

        return {
            "message": "Video processing started.",
            "task_id": task.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/task-status/{task_id}", tags=["Video"])
async def get_task_status(task_id: str):
    """Checks the status of a background task."""
    # Try to get result from either task type
    task_result = None
    try:
        task_result = generate_proxy.AsyncResult(task_id)
        if not task_result.ready():
            task_result = process_edit.AsyncResult(task_id)
    except:
        task_result = process_edit.AsyncResult(task_id)
    
    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result if task_result.ready() else None
    }