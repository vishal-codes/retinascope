import Navigation from "@/components/Navigation";
import Image from "next/image";
import Workspace from "@/components/Workspace";

const steps = [
  ["Image preprocessing", "The model receives a circular crop resized to 224 × 224 pixels, with local contrast enhancement and color normalization."],
  ["ResNet-50 inference", "A trained neural network assigns a probability to each of the five severity grades."],
  ["Grad-CAM overlay", "A heatmap highlights regions that influenced the model’s highest-scoring grade."],
  ["Review the results", "Compare the original image with the overlay and all five scores. A top score below 60% is flagged as low confidence."],
];
const grades = [
  ["none", "No DR", "No visible signs of diabetic retinopathy."],
  ["mild", "Mild NPDR", "Small changes called microaneurysms appear in retinal blood vessels."],
  ["moderate", "Moderate NPDR", "Retinal changes extend beyond microaneurysms and can include hemorrhages."],
  ["severe", "Severe NPDR", "More extensive bleeding or changes in the retinal blood vessels."],
  ["proliferative", "Proliferative DR", "Abnormal new blood vessels develop on the retina or optic disc."],
];

export default function Home() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <Navigation />
    <main id="main">
      <section className="hero section" id="home">
        <div className="container hero__grid">
          <div className="hero__content glass">
            <p className="eyebrow">Retinal imaging · Research prototype</p>
            <h1>Explore <span className="gradient-text">diabetic<br />retinopathy</span><br />grading</h1>
            <p className="hero__summary">Upload a fundus image to explore how a research model grades retinal changes. Compare its predictions and see which regions influenced the result.</p>
            <div className="hero__actions"><a className="btn btn--primary" href="#analyze">Analyze a scan</a>
              <a className="btn btn--ghost" href="#how-it-works">How it works</a></div>
          </div>
          <figure className="hero__eye-panel glass">
            <Image src="/retinal-cutaway.webp" width={1200} height={900}
              sizes="(min-width: 1100px) 420px, (min-width: 860px) 40vw, 90vw"
              className="retinal-cutaway" alt="Eye cutaway with arrows pointing to a retinal hemorrhage, hard exudates, and a microaneurysm." />
            <figcaption className="eye-label">Retinal changes in diabetic retinopathy</figcaption>
            <div className="eye-stats">{[["ResNet-50","Model"],["5","Grades"],["Grad-CAM","Overlay"]].map(([value,label]) =>
              <div key={label} className="eye-stat"><span className="eye-stat__val">{value}</span><span className="eye-stat__label">{label}</span></div>)}</div>
          </figure>
        </div>
      </section>
      <section className="section" id="analyze"><div className="container">
        <div className="section-header"><p className="eyebrow">Classifier · Upload scan</p><h2>Analyze your fundus image</h2>
          <p>Choose an image to preview it, then run the model to see its scores and activation map.</p></div>
        <Workspace />
        <aside className="notice"><strong>Research use only.</strong> This prototype is not a medical device and must not be used for diagnosis or treatment decisions. Performance may degrade on images from other cameras or datasets.</aside>
      </div></section>
      <section className="section" id="how-it-works"><div className="container">
        <div className="section-header"><p className="eyebrow">Methodology</p><h2>How the classifier works</h2></div>
        <ol className="how-grid" role="list">{steps.map(([title, description], i) =>
          <li className="how-card glass" key={title}><div className="how-card__num" aria-hidden="true">0{i+1}</div><h3>{title}</h3><p>{description}</p></li>)}</ol>
      </div></section>
      <section className="section" id="severity-guide"><div className="container">
        <div className="section-header"><p className="eyebrow">Severity guide</p><h2>Diabetic retinopathy severity grades</h2>
          <p>The model uses five grades. NPDR stands for nonproliferative diabetic retinopathy.</p></div>
        <ol className="severity-table" role="list">{grades.map(([color, name, description], i) =>
          <li className="severity-row glass" key={color}><div className="severity-row__left">
            <span className={"severity-badge "+color}><span className="severity-dot" />Grade {i}</span><strong>{name}</strong>
          </div><p className="severity-row__desc">{description}</p></li>)}</ol>
      </div></section>
    </main>
    <footer className="site-footer"><div className="container site-footer__inner"><span>RetinaScope · Research project by Vishal Vilas Shinde</span><a href="#home">Back to top ↑</a></div></footer>
  </>;
}
