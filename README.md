# ChatGPT-Like AI Chatbot UI (n8n Webhook Integration)

A modern, responsive conversational UI built with **HTML5, Vanilla CSS, and Vanilla JavaScript**, directly integrated with your **n8n AI Banking Assistant** workflow.

![ChatGPT UI Aesthetic](https://img.shields.io/badge/Design-ChatGPT%20Dark%20%26%20Light-10a37f?style=for-the-badge)
![n8n Connected](https://img.shields.io/badge/Workflow-n8n%20Webhook%20Live-EA4B71?style=for-the-badge)
![Pure Vanilla](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20JS-F7DF1E?style=for-the-badge)

---

## 🌟 Key Features

### 1. Authentic ChatGPT Look & Feel
- **Dark & Light Mode**: Default sleek dark theme with ChatGPT's zinc/obsidian palette (`#212121`, `#171717`, `#2f2f2f`, `#10a37f`) and one-click toggle to a clean light theme.
- **Collapsible Sidebar**: Organized conversation history grouped by **Today**, **Yesterday**, **Previous 7 Days**, and **Older**.
- **Multi-chat Sessions**: Create new conversations, search previous chats, rename titles, or delete conversations.
- **Persistent Storage**: All chat histories and preferences are safely stored in browser `localStorage`.
- **Hero / Welcome View**: Welcome screen with suggestion cards tailored to the Banking Assistant (Account Opening, Credit Cards, Loans, Security).

### 2. Full n8n Webhook Integration
- **Production URL**: Pre-configured to `https://yamuna0804.app.n8n.cloud/webhook/chat`.
- **Smart Payload Compatibility**: Sends `{ chatInput, message, prompt, query, sessionId }` in the POST request body so any n8n node configuration works seamlessly without errors.
- **Robust Response Parser**: Handles direct text, HTML, and JSON responses (`data.output`, `data.text`, `data.response`, etc.).
- **Simulated Real-time Streaming**: Renders responses with a typing stream effect for that signature ChatGPT feel.
- **Abort Generation**: A dedicated "Stop" button to cancel in-flight webhook requests.
- **Error Handling & Retry**: If the webhook encounters an issue, an inline error banner displays with an instant 1-click **Retry** button.

### 3. Rich Messaging & Developer Tools
- **Full Markdown Rendering**: Formats headers, bullet lists, tables, blockquotes, bold/italic text, and links.
- **Code Block Syntax Highlighting**: Highlight.js integration with syntax colors, language badges, and a **Copy code** button with tooltip confirmation.
- **Voice Typing (Speech-to-Text)**: Click the microphone icon to dictate prompts using the browser's Web Speech API.
- **Read Aloud (Text-to-Speech)**: Listen to bot responses with the speaker icon.
- **File Attachments**: Attach `.txt`, `.json`, `.csv`, `.md` documents with chip preview and auto-inclusion into the prompt.
- **Conversation Export**: Export individual conversations as **Markdown** files or backup all conversations as **JSON**.

### 4. Settings & Testing Modal
- Accessible via the gear icon or header settings button.
- **Live Ping & Latency Tester**: Test the n8n webhook directly with latency reporting (e.g. `200 OK - 320ms`).
- **Customizable Webhook URL**: Change or test different n8n environments (Test vs Production).

---

## 🚀 How to Run

### Option 1: Direct File Open (Zero Install)
You can directly double-click or open [`index.html`](file:///c:/Users/Student/Desktop/chatbox/index.html) in Google Chrome, Microsoft Edge, Firefox, or any modern web browser.

### Option 2: Local HTTP Server (Recommended)
A lightweight static server is included:
```bash
# Run using Node.js:
node server.js
```
Then visit **`http://localhost:3000`** in your browser.

Or with npm:
```bash
npm start
```

---

## 📁 File Structure

```
chatbox/
│── index.html        # Semantic HTML5 layout, modals, sidebar, & responsive viewport
│── style.css         # Modern ChatGPT stylesheet (CSS variables, dark/light themes, animations)
│── app.js            # Core application logic, n8n webhook communication, speech, & storage
│── server.js         # Zero-dependency local Node.js static web server (Port 3000)
│── package.json      # Project metadata & start script
└── README.md         # Comprehensive documentation
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Enter`** | Send message |
| **`Shift + Enter`** | Add new line in prompt input |
| **`Ctrl + Shift + O`** or **`Ctrl + K`** | Start a new chat |
| **`Ctrl + Shift + S`** | Toggle sidebar collapse / expand |
| **`Esc`** | Close open modals or dropdowns |

---

## 🔧 n8n Workflow Configuration Tips

Your n8n workflow uses:
`Webhook (POST)` ➔ `Basic LLM Chain` ➔ `Respond to Webhook`

- If you want the bot to remember past messages inside n8n, add a **Window Buffer Memory** node to the `Basic LLM Chain` and set Session Key to `={{ $json.body.sessionId }}`.
- The webhook endpoint accepts CORS requests directly from browsers without needing external proxies.
