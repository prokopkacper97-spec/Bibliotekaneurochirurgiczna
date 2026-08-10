import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["canvas", "pdfjs-dist"],
  // pdfjs-dist loads its worker script and standard fonts dynamically at
  // runtime, so Next's output file tracing can't discover them statically —
  // force them into the serverless function bundle explicitly.
  outputFileTracingIncludes: {
    "/api/books": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
  },
};

export default nextConfig;
