// Import the published browser bundle directly. This keeps esbuild's resolver
// independent from npm export-condition handling on Windows/OneDrive.
import { PaddleOCR } from './node_modules/@paddleocr/paddleocr-js/dist/index.mjs';

// Export the SDK from an ESM bundle. The offscreen document imports it lazily
// so failures during runtime setup can be reported by the OCR message handler.
export { PaddleOCR };
