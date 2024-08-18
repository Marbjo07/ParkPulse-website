# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.12.2
FROM python:${PYTHON_VERSION}-slim as base

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /usr/src/app

# Install unzip utility
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

# Download dependencies
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install -r requirements.txt

# Create a directory for the downloaded files
RUN mkdir -p /usr/src/app/downloads && chown -R appuser:appuser /usr/src/app/downloads

# Run the downloadTiles.py script to download the zip files into the downloads directory
COPY ./app/downloadTiles.py /usr/src/app/downloadTiles.py
RUN python downloadTiles.py --output-dir /usr/src/app/downloads

RUN chown -R appuser:appuser /usr/src/app/downloads

# Switch to the non-privileged user to run the application.
USER appuser

# Unzip the downloaded files while preserving folder structure
RUN for dir in downloads/zips/*; do \
        city=$(basename "$dir"); \
        mkdir -p "downloads/pulse_tiles/$city"; \
        echo "downloads/pulse_tiles/$city"; \
        find "$dir" -name "*.zip" -exec unzip -d "downloads/pulse_tiles/$city" {} \;; \
    done

# Copy the source code into the container.
COPY . .
COPY gunicorn_config.py /app/gunicorn_config.py
COPY ./app /usr/src/app
COPY ./downloads downloads:

# Expose the port that the application listens on.
EXPOSE 5000
ENV PYTHONPATH=/usr/src/app/app
# Run the application.
CMD ["gunicorn","-c", "gunicorn_config.py", "app:app"]
