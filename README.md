
# Screen Audio Visualizer

Visualize the audio from your screen or browser tab in real time. This app lets you share your screen (with system or tab audio) and displays a frequency spectrum using the Web Audio API.

## Features

- Real-time audio visualization from shared screen or tab
- Screen sharing with system/tab audio (Chromium browsers)
- Customizable spectrum: adjust bar count (up to 256), color scheme, frequency range, smoothing, and linear/logarithmic scale
- Multiple color schemes (rainbow, fire, ocean, green, purple)
- Responsive, normalized bar heights for accurate audio representation
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
3. Use the **Settings** panel below the visualizer to:
   - Change the color scheme
   - Adjust the number of bars (8–256)
   - Set minimum and maximum frequency range
   - Choose between logarithmic and linear frequency scale
   - Adjust smoothing for a more fluid or snappier display
4. Watch the audio spectrum react to the sound in real time.
5. Click **Stop Visualizer** to end.

> Note: Audio capture from screen sharing is only supported in Chromium browsers (Chrome, Edge, Opera). Firefox and Safari do not support capturing system audio.

## License

MIT
