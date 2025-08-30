import React, { useState, useRef } from 'react';
import './App.css';

const API = '';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [proxyUrl, setProxyUrl] = useState('');
  const [taskId, setTaskId] = useState('');
  const [status, setStatus] = useState('');
  const [videos, setVideos] = useState({ originals: [], proxies: [] });
  const videoRef = useRef();

  // Upload video
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/upload-video/', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setTaskId(data.task_id);
    setStatus('Processing proxy...');
  };

  // Check task status
  const checkStatus = async () => {
    if (!taskId) return;
    const res = await fetch(`/task-status/${taskId}`);
    const data = await res.json();
    setStatus(data.status);
    if (data.status === 'SUCCESS') {
      fetchVideos();
    }
  };

  // Fetch video lists
  const fetchVideos = async () => {
    const res = await fetch('/videos/');
    const data = await res.json();
    setVideos(data);
    if (data.proxies.length > 0) {
      setProxyUrl(`/download/proxy/${data.proxies[data.proxies.length - 1]}`);
    }
  };

  // Submit edit job (cut example)
  const handleCut = async () => {
    if (!videoFile) return;
    const params = { start: 0, end: 5 };
    const res = await fetch('/edit/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: videoFile.name,
        edit_type: 'cut',
        params,
      }),
    });
    const data = await res.json();
    setTaskId(data.task_id);
    setStatus('Edit job started...');
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>Video Editor MVP</h1>
      <input type="file" accept="video/*" onChange={handleUpload} />
      <button onClick={checkStatus} disabled={!taskId}>Check Status</button>
      <div>Status: {status}</div>
      <button onClick={fetchVideos}>Refresh Videos</button>
      {proxyUrl && (
        <div>
          <h2>Proxy Preview</h2>
          <video ref={videoRef} src={proxyUrl} controls width="100%" />
          <div>
            <button onClick={handleCut}>Cut (0-5s)</button>
          </div>
        </div>
      )}
      <div>
        <h3>Originals</h3>
        <ul>
          {videos.originals.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <h3>Proxies</h3>
        <ul>
          {videos.proxies.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
