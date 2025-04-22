import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Helmet } from "react-helmet";

const root = createRoot(document.getElementById("root")!);

root.render(
  <>
    <Helmet>
      <title>WordPress XML to Markdown Converter</title>
      <meta name="description" content="Convert WordPress XML export files to well-formatted Markdown" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    </Helmet>
    <App />
  </>
);
