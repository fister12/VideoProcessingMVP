# CapCut-like Video Editor MVP

A web-based video editing application built with FastAPI backend and React frontend, inspired by CapCut functionality.

## Features

- **Video Upload**: Upload video files through the web interface
- **Proxy Generation**: Automatically generates 360p proxy videos for smooth timeline scrubbing
- **Real-time Preview**: Scrub through video timeline using lightweight proxy videos
- **Basic Editing**: Cut/trim video segments
- **Background Processing**: Heavy video operations run asynchronously using Celery workers

## Architecture

- **Backend**: FastAPI with Celery for async video processing
- **Frontend**: React with Vite for fast development
- **Queue**: Redis for task management
- **Video Processing**: FFmpeg for video manipulation
- **Containerization**: Docker & Docker Compose for easy deployment

## Quick Start

1. **Prerequisites**
   - Docker Desktop installed and running
   - Git (to clone the repository)

2. **Run the Application**
   ```bash
   docker-compose up --build
   ```

3. **Access the Applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## How to Use

1. **Upload a Video**
   - Open http://localhost:3000
   - Click "Choose File" and select a video file
   - The system will automatically start generating a proxy video

2. **Check Processing Status**
   - Click "Check Status" to see proxy generation progress
   - Once complete, the proxy video will appear for preview

3. **Preview Video**
   - Use the video controls to scrub through the timeline
   - The proxy video provides smooth playback for editing decisions

4. **Edit Video**
   - Click "Cut (0-5s)" to extract the first 5 seconds of the video
   - Check status to monitor the edit job progress

5. **View Results**
   - Click "Refresh Videos" to see all processed videos
   - Download links will be available for both originals and processed videos

## API Endpoints

- `POST /upload-video/` - Upload a video file
- `GET /videos/` - List all videos
- `GET /download/original/{filename}` - Download original video
- `GET /download/proxy/{filename}` - Download proxy video
- `POST /edit/` - Submit video edit job
- `GET /task-status/{task_id}` - Check task progress

## Development

### Backend Development
- FastAPI code is in `app/main.py`
- Celery tasks are in `workers/tasks.py`
- Add new video processing features by creating new Celery tasks

### Frontend Development
- React code is in `frontend/src/`
- Main component is `frontend/src/App.jsx`
- Add new UI features by extending the React components

### Adding New Video Operations
1. Create a new Celery task in `workers/tasks.py`
2. Add corresponding API endpoint in `app/main.py`
3. Update frontend to call the new endpoint

## Project Structure

```
video-editor-backend/
├── app/
│   └── main.py              # FastAPI application
├── workers/
│   └── tasks.py             # Celery tasks for video processing
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css          # Styling
│   │   └── main.jsx         # React entry point
│   ├── package.json         # Frontend dependencies
│   └── vite.config.js       # Vite configuration
├── uploads/
│   ├── originals/           # Original video files
│   └── proxies/             # Generated proxy videos
├── docker-compose.yml       # Multi-container setup
├── Dockerfile              # Container definition
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## Troubleshooting

### Common Issues

1. **Containers won't start**
   - Check Docker Desktop is running
   - Try `docker-compose down` then `docker-compose up --build`

2. **Frontend can't connect to backend**
   - Ensure all containers are running
   - Check that ports 3000 and 8000 are available

3. **Video processing fails**
   - Check the worker logs with `docker-compose logs worker-1`
   - Ensure uploaded video format is supported by FFmpeg

4. **Upload directory permissions**
   - If uploads fail, check that the `uploads/` directory exists and is writable

### Viewing Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs api-1
docker-compose logs worker-1
docker-compose logs frontend-1
```

## Next Steps

To extend this MVP, consider adding:

- **Timeline scrubbing with frame-accurate seeking**
- **Multiple video track support**
- **Audio track editing**
- **Video effects and filters**
- **Export in multiple resolutions**
- **User authentication and project management**
- **Real-time collaboration features**

## License

This project is open source and available under the MIT License.
