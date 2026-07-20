// Minimal stub for local vendored PDF.js module.
// Replace this file with the official build from:
//   https://unpkg.com/pdfjs-dist@4.5.136/build/pdf.mjs

export const GlobalWorkerOptions = {};
export function getDocument() {
  throw new Error('PDF.js (vendor/pdfjs/pdf.mjs) no instalado. Copia el build oficial en vendor/pdfjs/.');
}
