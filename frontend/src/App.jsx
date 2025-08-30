import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [videos, setVideos] = useState({ originals: [], proxies: [] });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(0);
  const [taskStatus, setTaskStatus] = useState({});
  const videoRef = useRef();
  const timelineRef = useRef();

  // Fetch videos on component mount
  useEffect(() => {
    fetchVideos();
    
    // Keyboard shortcuts
    const handleKeyPress = (e) => {
      if (!selectedVideo || !videoRef.current) return;
      
      switch (e.key) {
        case ' ': // Spacebar for play/pause
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft': // Left arrow for -5 seconds
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, currentTime - 5);
          break;
        case 'ArrowRight': // Right arrow for +5 seconds
          e.preventDefault();
          videoRef.current.currentTime = Math.min(duration, currentTime + 5);
          break;
        case 'i': // 'i' key to set cut start
          e.preventDefault();
          setCutPoint('start');
          break;
        case 'o': // 'o' key to set cut end
          e.preventDefault();
          setCutPoint('end');
          break;
        case 'Enter': // Enter to add to timeline
          e.preventDefault();
          addToTimeline();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedVideo, currentTime, duration, cutStart, cutEnd, isPlaying]);

  // Fetch video lists
  const fetchVideos = async () => {
    try {
      const res = await fetch('/videos/');
      const data = await res.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  // Handle video upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/upload-video/', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      // Track upload task
      setTaskStatus(prev => ({
        ...prev,
        [data.task_id]: { type: 'upload', status: 'PENDING', filename: file.name }
      }));
      
      // Check status periodically
      checkTaskStatus(data.task_id);
    } catch (error) {
      console.error('Error uploading video:', error);
    }
  };

  // Check task status
  const checkTaskStatus = async (taskId) => {
    try {
      const res = await fetch(`/task-status/${taskId}`);
      const data = await res.json();
      
      setTaskStatus(prev => ({
        ...prev,
        [taskId]: { ...prev[taskId], status: data.status, result: data.result }
      }));

      if (data.status === 'PENDING' || data.status === 'RETRY') {
        setTimeout(() => checkTaskStatus(taskId), 1000);
      } else if (data.status === 'SUCCESS') {
        fetchVideos(); // Refresh video list
      }
    } catch (error) {
      console.error('Error checking task status:', error);
    }
  };

  // Load selected video
  const loadVideo = (videoName) => {
    const proxyUrl = `/download/proxy/proxy_${videoName}`;
    setSelectedVideo({ name: videoName, url: proxyUrl });
  };

  // Video event handlers
  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setCutEnd(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Timeline scrubbing
  const handleTimelineClick = (e) => {
    if (timelineRef.current && videoRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Set cut points
  const setCutPoint = (type) => {
    if (type === 'start') {
      setCutStart(currentTime);
    } else {
      setCutEnd(currentTime);
    }
  };

  // Add video segment to timeline
  const addToTimeline = () => {
    if (!selectedVideo) return;
    
    const newClip = {
      id: Date.now(),
      videoName: selectedVideo.name,
      startTime: cutStart,
      endTime: cutEnd,
      duration: cutEnd - cutStart
    };
    
    setTimeline([...timeline, newClip]);
  };

  // Remove clip from timeline
  const removeClip = (clipId) => {
    setTimeline(timeline.filter(clip => clip.id !== clipId));
  };

  // Process final video
  const processTimeline = async () => {
    if (timeline.length === 0) return;
    
    try {
      const outputFilename = `timeline_${Date.now()}.mp4`;
      const res = await fetch('/process-timeline/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: timeline,
          output_filename: outputFilename
        }),
      });
      
      const data = await res.json();
      setTaskStatus(prev => ({
        ...prev,
        [data.task_id]: { type: 'timeline', status: 'PENDING', filename: outputFilename }
      }));
      
      checkTaskStatus(data.task_id);
    } catch (error) {
      console.error('Error processing timeline:', error);
    }
  };

  // Drag and drop for timeline
  const handleDragStart = (e, clipId) => {
    e.dataTransfer.setData('text/plain', clipId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const draggedClipId = parseInt(e.dataTransfer.getData('text/plain'));
    const draggedClip = timeline.find(clip => clip.id === draggedClipId);
    const newTimeline = timeline.filter(clip => clip.id !== draggedClipId);
    newTimeline.splice(targetIndex, 0, draggedClip);
    setTimeline(newTimeline);
  };

  // Play selected clip in timeline
  const playTimelineClip = (clip) => {
    if (!videoRef.current) return;
    
    loadVideo(clip.videoName);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = clip.startTime;
        setCutStart(clip.startTime);
        setCutEnd(clip.endTime);
      }
    }, 500);
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-editor">
      <header className="editor-header">
        <h1>CapCut-like Video Editor</h1>
        <div className="header-controls">
          <div className="upload-section">
            <input type="file" accept="video/*" onChange={handleUpload} />
            <button onClick={fetchVideos}>Refresh Videos</button>
          </div>
          <div className="shortcuts-info">
            <details>
              <summary>⌨️ Shortcuts</summary>
              <div className="shortcuts-list">
                <span><kbd>Space</kbd> Play/Pause</span>
                <span><kbd>←</kbd> -5s</span>
                <span><kbd>→</kbd> +5s</span>
                <span><kbd>I</kbd> Set Cut Start</span>
                <span><kbd>O</kbd> Set Cut End</span>
                <span><kbd>Enter</kbd> Add to Timeline</span>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Task Status Display */}
      <div className="task-status">
        {Object.entries(taskStatus).map(([taskId, task]) => (
          <div key={taskId} className={`status-item ${task.status.toLowerCase()}`}>
            {task.type}: {task.filename} - {task.status}
          </div>
        ))}
      </div>

      <div className="editor-layout">
        {/* Video Library */}
        <div className="video-library">
          <h3>Video Library</h3>
          <div className="video-list">
            <h4>Original Videos</h4>
            {videos.originals.map((video) => (
              <div key={video} className="video-item">
                <span>{video}</span>
                <button onClick={() => loadVideo(video)}>Load</button>
              </div>
            ))}
            
            <h4>Proxy Videos</h4>
            {videos.proxies.map((proxy) => (
              <div key={proxy} className="video-item proxy">
                <span>{proxy}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Video Preview */}
        <div className="video-preview">
          {selectedVideo && (
            <>
              <video
                ref={videoRef}
                src={selectedVideo.url}
                onLoadedMetadata={handleVideoLoad}
                onTimeUpdate={handleTimeUpdate}
                controls={false}
                width="100%"
                height="300px"
              />
              
              <div className="video-controls">
                <button onClick={handlePlayPause}>
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                <button onClick={() => setCutPoint('start')}>
                  Set Cut Start
                </button>
                <button onClick={() => setCutPoint('end')}>
                  Set Cut End
                </button>
                <button onClick={addToTimeline}>
                  Add to Timeline
                </button>
              </div>

              <div className="cut-info">
                Cut: {formatTime(cutStart)} - {formatTime(cutEnd)} 
                ({formatTime(cutEnd - cutStart)})
              </div>

              {/* Timeline Scrubber */}
              <div 
                className="timeline-scrubber"
                ref={timelineRef}
                onClick={handleTimelineClick}
              >
                <div className="timeline-track">
                  <div 
                    className="timeline-progress"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  <div 
                    className="cut-start-marker"
                    style={{ left: `${(cutStart / duration) * 100}%` }}
                  />
                  <div 
                    className="cut-end-marker"
                    style={{ left: `${(cutEnd / duration) * 100}%` }}
                  />
                  <div 
                    className="cut-range"
                    style={{ 
                      left: `${(cutStart / duration) * 100}%`,
                      width: `${((cutEnd - cutStart) / duration) * 100}%`
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Timeline Editor */}
      <div className="timeline-editor">
        <h3>Timeline ({timeline.length} clips)</h3>
        <div className="timeline-tracks">
          {timeline.map((clip, index) => (
            <div 
              key={clip.id} 
              className="timeline-clip"
              draggable
              onDragStart={(e) => handleDragStart(e, clip.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => playTimelineClip(clip)}
            >
              <div className="clip-info">
                <span className="clip-name">{clip.videoName}</span>
                <span className="clip-time">{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</span>
                <span className="clip-duration">({formatTime(clip.duration)})</span>
              </div>
              <div className="clip-actions">
                <button onClick={(e) => { e.stopPropagation(); playTimelineClip(clip); }}>
                  ▶️
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {timeline.length === 0 && (
            <div className="empty-timeline">
              <p>Timeline is empty. Add video segments above to start editing.</p>
            </div>
          )}
        </div>
        {timeline.length > 0 && (
          <div className="timeline-actions">
            <button onClick={() => setTimeline([])} className="clear-btn">
              Clear Timeline
            </button>
            <button onClick={processTimeline} className="process-btn">
              🎬 Export Final Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
