import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/upload-video': 'http://api:8000',
      '/videos': 'http://api:8000',
      '/download': 'http://api:8000',
      '/edit': 'http://api:8000',
      '/task-status': 'http://api:8000',
    },
  },
});
