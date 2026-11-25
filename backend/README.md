# Retina Scope backend

With uv, run `uv sync` in this directory to install the runtime and test dependencies. Linux uses the CPU PyTorch wheels. Start the API for the local frontend with:

```sh
FRONTEND_ORIGIN=http://localhost:3000 uv run uvicorn main:app --port 8000
```

Run the backend checks with `uv run pytest`.

Alternatively, use a Python virtual environment and install `requirements.txt`. Set `FRONTEND_ORIGIN=http://localhost:3000` and run `uvicorn main:app --port 8000` from this directory. Startup loads `models/best_model.pt`. Set `MODEL_PATH` to use a different location for that checkpoint.

For tests install `pytest httpx` and run `pytest`. Set `HELD_OUT_DIR` to a local folder containing non-identifying JPG or PNG fixtures in subfolders named for their expected class.

Build with `docker build -t retina-scope-backend .`. Mount the weights at runtime:

```sh
docker run --rm -p 8000:8000 -e FRONTEND_ORIGIN=http://localhost:3000 \
  -v "$PWD/models:/app/models:ro" retina-scope-backend
```
