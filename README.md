# RetinaScope

RetinaScope is a research web app for exploring how a fine-tuned ResNet-50 grades diabetic retinopathy in retinal fundus photographs. Upload a JPG or PNG to compare the original photograph with a Grad-CAM overlay and inspect the model’s probability for each of five severity grades.

**Research use only.** This prototype is not a medical device and must not be used for diagnosis or treatment decisions. Performance can degrade on images from other cameras and datasets.

## Research paper

Srinjoy Maji, Vishal Vilas Shinde, and Sampson E. Akwafuo. **Optimizing ResNet-50 for Multi-Class Diabetic Retinopathy Grading: An Explainable AI Approach.** Presented at the 27th IEEE International Conference on Information Reuse and Integration for Data Science (IEEE IRI 2026), July 31–August 2, 2026, in Seattle, WA, USA. [Published paper on IEEE Xplore](https://ieeexplore.ieee.org/document/11676652) · [DOI 10.1109/IRI69576.2026.00079](https://doi.org/10.1109/IRI69576.2026.00079)

The study combined circular cropping and contrast-limited adaptive histogram equalization (CLAHE) with synthetic augmentation of the training images. The authors fine-tuned ResNet-50 in two phases to classify five severity stages. Across **five-fold cross-validation**, they reported **84.51% accuracy**, **0.8226 quadratic weighted kappa (QWK)**, **0.9749 ROC AUC**, and high specificity at every severity level. These metrics summarize the paper’s evaluation. The confidence displayed by the app is the model’s score for a single uploaded image.

## How the app works

1. The Next.js frontend previews the selected image locally. Selecting **Analyze image** sends it to the FastAPI backend. Uploads are limited to 10 MB and processed in memory.
2. The backend crops the retinal field, resizes it to 224 × 224 pixels, enhances local contrast with CLAHE, and applies ImageNet normalization. The trained model loads once at startup and runs on CPU.
3. The results view shows probabilities in clinical order, from **No DR → Mild → Moderate → Severe → Proliferative DR**. A top probability below 60% triggers a low-confidence message. The Grad-CAM overlay highlights regions that influenced the prediction and does not delineate individual lesions.

## Run locally

You’ll need Python 3.13, uv, Node.js, pnpm, and the trained checkpoint. Place the weights at `backend/models/best_model.pt` or set `MODEL_PATH` to the checkpoint’s absolute path. Keep model weights outside version control.

**Backend** — from the repository root, in one terminal:

```sh
cd backend
uv sync
FRONTEND_ORIGIN=http://localhost:3000 uv run uvicorn main:app --port 8000
```

**Frontend** — from the repository root, in a second terminal:

```sh
cd frontend
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev
```

Open [RetinaScope on localhost](http://localhost:3000), choose a non-identifying fundus image, and select **Analyze image**. For a hosted frontend, set `NEXT_PUBLIC_API_URL` to the backend’s public HTTPS origin before building. Set the backend’s `FRONTEND_ORIGIN` to the exact origin serving the frontend.

## API

| Endpoint | Request | Response |
| --- | --- | --- |
| `GET /health` | No body | `{"status":"ok"}` |
| `POST /predict` | Multipart form with a JPG or PNG in the `file` field | `grade`, `confidence`, five named `probabilities`, and `gradcam_overlay` as a base64-encoded PNG |

## Development

| Directory | Stack | Checks |
| --- | --- | --- |
| [frontend/](frontend/README.md) | Next.js, TypeScript, Tailwind CSS | `pnpm lint` and `pnpm build` |
| [backend/](backend/README.md) | FastAPI, PyTorch, torchvision, OpenCV | `uv run pytest` |

Run each check from its corresponding directory. The backend guide also covers CPU Docker deployment and testing expected grades on held-out images.
