/// <reference lib="webworker" />
// pdf.js's worker entry. Loaded inside a Worker it wires itself to `self`, so
// importing it is all this file needs to do; the bundler gives it a URL.
import 'pdfjs-dist/build/pdf.worker.min.mjs'
