import subprocess
from celery import Celery

# The broker URL points to the 'redis' service defined in docker-compose.yml
celery_app = Celery(
    'tasks',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/0'
)

@celery_app.task
def generate_proxy(input_path: str, output_path: str):
    """Generates a 360p proxy video using FFmpeg."""
    print(f"Starting proxy generation for {input_path}")
    try:
        command = [
            'ffmpeg', '-i', input_path, '-vf', 'scale=-2:360',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
            '-c:a', 'aac', '-b:a', '128k', output_path
        ]
        subprocess.run(command, check=True, capture_output=True)
        print(f"Successfully generated proxy: {output_path}")
        return {"status": "success", "proxy_path": output_path}
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg failed: {e.stderr.decode()}")
        return {"status": "error", "message": e.stderr.decode()}


# Basic video edit task (e.g., cut)
@celery_app.task
def process_edit(input_path: str, output_path: str, edit_type: str, params: dict):
    """Processes video edit jobs (currently supports 'cut')."""
    print(f"Starting edit job: {edit_type} for {input_path}")
    try:
        if edit_type == 'cut':
            start = params.get('start', 0)
            end = params.get('end', 5)
            command = [
                'ffmpeg', '-i', input_path,
                '-ss', str(start), '-to', str(end),
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
                '-c:a', 'aac', '-b:a', '128k', output_path
            ]
            subprocess.run(command, check=True, capture_output=True)
            print(f"Successfully cut video: {output_path}")
            return {"status": "success", "output_path": output_path}
        else:
            return {"status": "error", "message": f"Unsupported edit type: {edit_type}"}
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg failed: {e.stderr.decode()}")
        return {"status": "error", "message": e.stderr.decode()}