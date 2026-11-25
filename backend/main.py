import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from python_multipart.exceptions import MultipartParseError
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser

from inference import InvalidImage, load_model, predict

MAX_FILE = 10 * 1024 * 1024
MAX_BODY = MAX_FILE + 64 * 1024


@asynccontextmanager
async def lifespan(app):
    app.state.model = load_model()
    yield


app = FastAPI(lifespan=lifespan)
origin = os.getenv("FRONTEND_ORIGIN")
if origin and origin != "*":
    app.add_middleware(CORSMiddleware, allow_origins=[origin], allow_methods=["POST", "GET"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def prediction(request: Request):
    async def limited_body():
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_BODY:
                raise HTTPException(413, "File exceeds 10 MB.")
            yield chunk

    if request.headers.get("content-type", "").split(";")[0] != "multipart/form-data":
        raise HTTPException(415, "Expected a multipart JPG or PNG upload.")
    parser = MultiPartParser(request.headers, limited_body(), max_files=1, max_fields=0)
    parser.spool_max_size = MAX_BODY + 1  # Accepted streams stay in memory.
    try:
        form = await parser.parse()
    except (MultiPartException, MultipartParseError) as exc:
        raise HTTPException(400, "Invalid multipart upload.") from exc
    try:
        file = form.get("file")
        if not isinstance(file, UploadFile):
            raise HTTPException(400, "Choose an image in the file field.")
        if file.size > MAX_FILE:
            raise HTTPException(413, "File exceeds 10 MB.")
        if file.content_type not in {"image/jpeg", "image/png"}:
            raise HTTPException(415, "Choose a JPG or PNG file.")
        data = await file.read()
        try:
            return await run_in_threadpool(predict, request.app.state.model, data, file.content_type)
        except InvalidImage as exc:
            raise HTTPException(400, str(exc)) from exc
        except Exception as exc:
            raise HTTPException(500, "Image analysis failed.") from exc
    finally:
        await form.close()
