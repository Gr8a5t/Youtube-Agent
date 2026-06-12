# 🎬 YouTube AI Research Dashboard & Clipper

A premium, high-fidelity web workspace and AI Research Assistant that lets you search YouTube videos, generate instant transcript summaries, chat with transcripts, and clip/download highlight reels in seconds.

Built with direct browser integration for **Google Gemini API** (using privacy-first local storage for your API key) and a backend powered by **Model Context Protocol (MCP)** and **FFmpeg**.

---

## 🌟 Key Features

* **Interactive Q&A Chat:** Chat with any video transcript directly. Ask questions about specific sections, and navigate directly to those moments.
* **One-Click Video Clipping (Reels/Shorts):**
  * **Range Clipping:** Timestamps like `[00:03-00:10]` in the summary or chat get an instant **Clip** button next to them. Clicking it switches to the Clipper tab and pre-fills the segment.
  * **Point Clipping:** Single timestamps like `[00:46]` get a **Clip** button that automatically creates a 10-second highlight starting at that moment.
* **Fully Responsive Stack Layout:** The workspace looks beautiful and works seamlessly across desktops, laptops, tablets, and mobile phones.
* **Custom Model Override:** Choose from standard Gemini models (automatically discovered based on your key) or type in any custom model ID (e.g. `gemini-1.5-flash-latest`).
* **Privacy First:** Your Gemini API key is stored locally in your browser's `localStorage` and is never sent to or stored on the server.
* **Multi-Clip Highlights:** Define multiple segments, label them, and let the backend combine them into a single highlight reel using FFmpeg.

---

## 🚀 One-Click Deploy to Render

We've pre-configured this repository with a `render.yaml` Blueprint file, making deployment completely automatic:

1. Push this code to your GitHub repository (e.g. `Gr8a5t/Youtube-Agent`).
2. Go to the [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** -> **Blueprint**.
4. Select your repository `Youtube-Agent`.
5. Render will automatically parse the blueprint and provision a web service on the **Free Tier**.
6. Click **Apply**. Once built, open the generated `.onrender.com` URL to launch your dashboard!

*Note: No environment variables are needed on Render. You can paste your Gemini API Key directly inside the dashboard's **Settings** tab in your browser.*

---

## 💻 Local Setup & Development

Run the dashboard and server locally on your machine:

### Prerequisites
* Node.js (version 18 or higher)
* FFmpeg (installed and added to your system PATH for video clipping)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Run the server locally:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser to access the dashboard.

---

## 🔌 Model Context Protocol (MCP) Integration

This application is also a fully compliant MCP server! You can plug it into clients like **Claude Code**, **Cursor**, or **Gemini CLI**.

To connect a client to the local server via Stdio:
```json
{
  "mcpServers": {
    "youtube-agent": {
      "command": "node",
      "args": ["/absolute/path/to/Youtube-Agent/dist/index.js"]
    }
  }
}
```

Or connect via SSE (Server-Sent Events) by running the server with the `--sse` flag or configuring the `PORT` environment variable.

---

## 🍪 Bypassing YouTube "Sign in to confirm you're not a bot" Errors

YouTube frequently blocks requests originating from cloud hosting servers (like Render or AWS), resulting in an error asking you to sign in. 

To bypass this verification check, you can pass your YouTube session cookies to the server:

1. **Export Cookies:**
   * Install a browser extension like **Get cookies.txt LOCALLY** (Chrome/Firefox).
   * Open YouTube, log in, and use the extension to export your cookies in **Netscape format**.
2. **Configure on Server:**
   * **Local Development:** Save the exported cookies file as `cookies.txt` or `.cookies.txt` in the root of your project directory. The backend will automatically detect and load it.
   * **Render/Cloud Deployment:** Define a `YOUTUBE_COOKIES_PATH` environment variable on your Render service dashboard pointing to a path containing the cookie file, or securely copy the file to the deployment environment.

---

## 📜 License & Attributions

Licensed under the [Apache License 2.0](LICENSE). 

*This is a fork of [JCodesMore/youtube-for-ai-agents](https://github.com/JCodesMore/youtube-for-ai-agents).*

> Uses [youtubei.js](https://github.com/LuanRT/YouTube.js), an unofficial YouTube client. Not affiliated with, endorsed by, or associated with YouTube or Google.
