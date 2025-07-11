
# Screen Audio Visualizer

Visualize the audio from your screen or browser tab in real time. This app lets you share your screen (with system or tab audio) and displays a frequency spectrum using the Web Audio API.

## Features

- Real-time audio visualization from shared screen or tab
- Screen sharing with system/tab audio (Chromium browsers)
- Dynamic, colorful spectrum bars
- Built with React, TypeScript, Vite, and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- pnpm (or use npm/yarn)

### Installation

```bash
pnpm install
# or
npm install
# or
yarn install
```

### Running the App

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. Click **Start Visualizer**.
2. Select a screen or tab to share, and make sure to check **Share system audio** or **Share tab audio**.
3. Watch the audio spectrum react to the sound.
4. Click **Stop Visualizer** to end.

> Note: Audio capture from screen sharing is only supported in Chromium browsers (Chrome, Edge, Opera). Firefox and Safari do not support capturing system audio.

## License

MIT
