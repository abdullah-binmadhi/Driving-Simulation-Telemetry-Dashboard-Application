# Deployment Guide

This application is a **Desktop Application** built with [Electron](https://www.electronjs.org/).

## Why Desktop?

While the user interface is built with standard web technologies (React, Tailwind CSS), the application relies on Electron to access system features (UDP sockets for telemetry, SQLite database, File System) that are not available in a standard web browser.

## How to Build / Deploy

To create a standalone application (e.g., `.dmg` or `.app` for macOS), run the following command in your terminal:

```bash
npm run build
```

This script performs the following steps:

1. Compiles the TypeScript code (`tsc`).
2. Builds the React frontend (`vite build`).
3. Builds the Electron backend.
4. Packages everything into an installer using `electron-builder`.

### Output Location

After the build completes, your application artifacts will be located in:

```bash
dist-app/
```

- **macOS:** `dist-app/mac-arm64/` (containing `Driving Telemetry Dashboard.app` and `.dmg`)

### Code Signing (Important)

Currently, the build process may show errors related to **Code Signing** if you do not have an Apple Developer Certificate set up.

- **Local Use:** You can ignore signing errors for local testing. The generated `.app` should still run on your machine, though macOS might warn you about it being unsigned or damaged (you may need to allow it in System Settings > Privacy & Security > Security).
- **Public Distribution:** To distribute this app to others without warnings, you need to:
    1. Enroll in the Apple Developer Program.
    2. Generate Developer ID certificates.
    3. Configure `electron-builder` with your credentials.
