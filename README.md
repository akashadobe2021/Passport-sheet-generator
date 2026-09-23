# Passport Sheet Generator (Studio Edition)

A high-performance, offline-first web application for photo studios, print shops, and individuals to upload a single portrait photograph, auto-align to official Indian passport standards (35×45mm with 70–80% face coverage), and generate uncompressed, print-ready A4 photo sheets (at 300 or 600 DPI) as vector PDFs or high-resolution images.

---

## 🚀 One-Click Start (Windows Users)

### If you **DO NOT** have Node.js installed:
No problem! You do **not** need to install Node.js or have administrator privileges.
1. Simply double-click **`run.bat`** (or `setup_portable_node.bat`).
2. The script will automatically fetch official portable **Node.js v24.21.0** from `nodejs.org`, unpack it into a local folder (`node-portable`), install dependencies, and launch your browser at `http://localhost:3000`.

### If you **ALREADY HAVE** Node.js installed:
1. Double-click **`run.bat`**, OR open a terminal in this folder and run:
   ```bash
   npm install --legacy-peer-deps
   npm run dev
   ```
2. Open your browser at `http://localhost:3000`.

---

## 📋 Features

- **Indian Passport Standard (35×45mm)**: Built-in 70%–80% head coverage alignment guide (Crown, Eye Level, and Chin guides).
- **Other Presets**: Indian Visa (50×50mm / 2"×2"), PAN Card (25×35mm), Stamp Size, and custom millimeter dimensions.
- **Auto-Center Face**: Algorithmic facial landmark detection to automatically scale and center the subject at 75% height.
- **Studio Background Replacer**: Pure White, Studio Light Blue, and Neutral Grey chroma replacement.
- **A4 / 4×6 / 5×7 / Letter Sheets**: 4, 8, 16, 24, 32, 40, or 48 copies per sheet with adjustable margins and spacing.
- **Finishing & Cutting Guides**: Vector corner ticks, dashed lines, and 0.2mm edge borders for easy guillotining.
- **Lossless Output**: Uncompressed vector PDF (`pdf-lib`), high-resolution PNG/JPEG sheets, and single photo downloads.
- **Effective DPI Quality Audit**: Real-time warning if photo resolution drops below 300 DPI.
- **100% Client-Side**: No photos are ever sent to an external server or cloud; all processing is local.

---

## 🛠 Manual Portable Node.js Setup (Optional)
If your machine is completely offline or blocks script downloads:
1. Download `node-v24.21.0-win-x64.zip` from:
   https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip
2. Extract the archive into a folder named `node-portable` in the project root.
3. Double-click `run.bat`.
