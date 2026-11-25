import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Retina Scope | Fundus image analysis",
  description: "A research workspace for diabetic retinopathy grading.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" suppressHydrationWarning><head>
    <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')==='dark')document.documentElement.dataset.theme='dark'}catch{}" }} />
  </head><body>{children}</body></html>;
}
