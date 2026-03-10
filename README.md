# Driving Simulation Telemetry Dashboard

An advanced, real-time vehicle telemetry dashboard built using **Electron**, **React**, **TypeScript**, and **Vite**.

This application connects to racing simulators (or runs natively with a built-in Browser Simulator fallback) to visualize complex driving physics dynamics mathematically. It includes real-time track mapping, G-force friction circles, input behavior analysis, and precision data logging.

![Dashboard Preview](https://github.com/abdullah-binmadhi/Driving-Simulation-Telemetry-Dashboard-Application/assets/hero-image.png) <!-- Update later with a real path if needed -->

## Features

- **Live Traces**: Dynamic Multi-Graph visualizing Speed, RPM, Throttle (%), and Brake (%).
- **Friction Circle**: A live G-Force diagram plotting lateral and longitudinal stress limits (Max 2.5G).
- **Behavior Analysis**: Smoothness, brake capacity utilization, and oversteer/understeer behavioral tracking variables.
- **Track Mapper**: Real-time positional mapping recreating the track geometry dynamically as you drive.
- **Data Logger**: Export deduplicated, formatted session histories as `.csv` sheets straight to your local system for deep Machine Learning or statistical analysis.

---

## Installation & Setup

Before starting, ensure you have [Node.js](https://nodejs.org/) (version 18+ recommended) installed on your system.

### Option 1: Development Server (Browser or Live Mock)

If you just want to run the React interface without compiling the desktop application:

```bash
# Install all required dependencies
npm install

# Run the Vite React UI locally (Starts at http://localhost:5173/)
npm run dev:ui
```

*Note: To simulate live car telemetry in the browser without launching a heavy game, navigate to the Dashboard's **Settings** (gear icon) and toggle **"Simulation Mode"**.*

### Option 2: Build the Native Desktop Application

If you want to compile the overarching Electron project to a system-native executable:

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Build for macOS (Apple Silicon / Intel):**

   ```bash
   npm run build
   ```

   By default, this compiles the TypeScript, bundles Vite, and uses `electron-builder` to package the app. Once finished, navigate to the newly generated `dist-app/` folder. You will find a ready-to-use `.dmg` installer and a `.app` file tailored for macOS.

3. **Build for Windows:**
   On a Windows machine, the identical build command triggers the `nsis` Windows target inside `package.json`:

   ```bash
   npm run build
   ```

   Check the `dist-app/` folder for the freshly built Windows `.exe` installer.

---

## How to Record & Download Telemetry Data

The dashboard includes a highly compressed Data Logger that filters duplicate millisecond timings and truncates excessive float precision down to 2 decimal places to minimize file bloat.

**Data Export Workflow:**

1. Connect to a valid telemetry source (or enable **Simulation Mode** in the settings).
2. Locate the **"Data Logger (To DB)"** widget on the left side of the Dashboard.
3. Click **Start Rec**. The widget will pulse red and begin aggregating frame arrays.
4. Drive! Data is continuously written into the local SQLite memory pool.
5. When finished, click **Stop Rec**.
6. A new button will glow blue: **Export CSV**. Click this button.
7. The system's native OS *Save Dialog* will appear. Choose where you want to download `session-[ID].csv` to your computer.

The exported `.csv` document scales your inputs (Throttle/Brake/Clutch) mathematically into 0-100 percentages, ready for immediate spreadsheet import.
