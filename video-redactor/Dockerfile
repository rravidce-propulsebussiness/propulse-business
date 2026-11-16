FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libglib2.0-0 libgl1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY worker.py audit_project_audio.py ./
RUN chmod 1777 /tmp && python -m py_compile worker.py audit_project_audio.py
USER 65532:65532
CMD ["python","-u","worker.py"]
