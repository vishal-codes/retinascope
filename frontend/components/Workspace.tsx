"use client";

import { useEffect, useRef, useState } from "react";

const classes = ["No_DR", "Mild", "Moderate", "Severe", "Proliferative_DR"] as const;
type Grade = typeof classes[number];
type Prediction = { grade: Grade; confidence: number; probabilities: Record<Grade, number>; gradcam_overlay: string };
const labels: Record<Grade, string> = { No_DR: "No DR", Mild: "Mild", Moderate: "Moderate", Severe: "Severe", Proliferative_DR: "Proliferative DR" };

function Results({ result, original }: { result: Prediction; original: string }) {
  return <section className="mt-7 space-y-5" aria-label="Analysis results">
    <h2 className="text-2xl font-semibold">{result.confidence < 0.6 ? "Low confidence" : "Predicted grade · " + labels[result.grade]}</h2>
    <p>Highest model probability: {(result.confidence * 100).toFixed(1)}%</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {[[original, "Original image"], ["data:image/png;base64," + result.gradcam_overlay, "Grad-CAM overlay"]].map(([src, title]) =>
        <figure key={title}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Private, in-memory image. */}
          <img src={src} alt={title} className="aspect-square w-full rounded-lg bg-slate-950 object-contain" />
          <figcaption className="mt-2 font-medium">{title}</figcaption>
        </figure>)}
    </div>
    <p>Grad-CAM highlights regions that influenced the prediction. It is a qualitative aid, not a lesion segmentation.</p>
    <h3 className="text-xl font-semibold">Class probabilities</h3>
    {classes.map(key => <div key={key}>
      <div className="flex justify-between"><span>{labels[key]}</span><span>{(result.probabilities[key] * 100).toFixed(1)}%</span></div>
      <progress aria-label={labels[key]} value={result.probabilities[key]} max={1} className="w-full accent-teal-800" />
    </div>)}
  </section>;
}

export default function Workspace() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function select(candidate?: File) {
    setError("");
    setResult(null);
    setFile(null);
    setPreview("");
    if (!candidate) return;
    if (!["image/png", "image/jpeg"].includes(candidate.type)) return setError("Choose a JPG or PNG image.");
    if (candidate.size > 10 * 1024 * 1024) return setError("Choose an image of 10 MB or less.");
    setPreview(URL.createObjectURL(candidate));
    setFile(candidate);
  }

  async function analyze() {
    if (!file || busy) return;
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) return setError("The analysis service URL has not been configured.");
    const body = new FormData();
    body.append("file", file, "upload");
    controller.current = new AbortController();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(api.replace(/\/$/, "") + "/predict", { method: "POST", body, signal: controller.current.signal, redirect: "error", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Analysis failed.");
      if (!classes.includes(data?.grade) || !Number.isFinite(data.confidence) || !classes.every(key => Number.isFinite(data.probabilities?.[key])) || typeof data.gradcam_overlay !== "string")
        throw new Error("The service returned an incomplete result.");
      setResult(data);
    } catch (err) {
      setError(err instanceof TypeError ? "Couldn’t connect to the analysis service. Your image is still selected." : err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="workspace">
    <label className="dropzone glass" data-dragging={dragging} htmlFor="fundus"
      onDragOver={event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = busy ? "none" : "copy";
        setDragging(!busy);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        if (!busy) select(event.dataTransfer.files[0]);
      }}>
      <input id="fundus" type="file" accept="image/jpeg,image/png" disabled={busy}
        className="sr-only" aria-label={file ? "Replace fundus image" : "Choose fundus image"}
        aria-describedby="formats" onChange={event => {
          const candidate = event.target.files?.[0];
          event.target.value = "";
          if (candidate) select(candidate);
        }} />
      {preview && !result && (
        /* eslint-disable-next-line @next/next/no-img-element -- Private object URL. */
        <img className="preview" src={preview} alt="Selected retinal fundus image" />
      )}
      {!file && <span className="upload-glyph" aria-hidden="true">⇧</span>}
      <strong>{file ? file.name : "Drop your fundus image here"}</strong>
      <span className="browse">{file ? "Choose a different image" : "Browse files"}</span>
      <small id="formats">JPG or PNG · Up to 10 MB</small>
    </label>
    {error && <p role="alert" className="error">{error}</p>}
    <button hidden={!file} disabled={!file || busy} onClick={analyze} className="analyze">
      {busy ? "Analyzing…" : error && file ? "Retry analysis" : "Analyze image"}
    </button>
    <p role="status" className="sr-only">{busy ? "Analyzing image…" : result ? "Analysis complete." : ""}</p>
    {result && <Results result={result} original={preview} />}
  </div>;
}
