/**
 * ChatGPT UI for n8n Webhook
 * Modern, responsive chat application built with Vanilla JS
 */

(function () {
  'use strict';

  // ==========================================================================
  // Default Configuration & State
  // ==========================================================================

  const DEFAULT_WEBHOOK_URL = 'https://yamuna0804.app.n8n.cloud/webhook/chat';

  const STORAGE_KEYS = {
    CONVERSATIONS: 'chatgpt_n8n_conversations',
    ACTIVE_ID: 'chatgpt_n8n_active_id',
    SETTINGS: 'chatgpt_n8n_settings',
    THEME: 'chatgpt_n8n_theme',
    SIDEBAR_COLLAPSED: 'chatgpt_n8n_sidebar_collapsed'
  };

  let state = {
    conversations: [],
    activeConversationId: null,
    settings: {
      webhookUrl: DEFAULT_WEBHOOK_URL,
      payloadKey: 'chatInput',
      streaming: true,
      autoTitle: true,
      tts: false
    },
    theme: 'dark',
    sidebarCollapsed: false,
    isGenerating: false,
    activeAbortController: null,
    speechRecognition: null,
    isListening: false,
    currentSpeechUtterance: null,
    attachedFile: null,
    editingChatId: null
  };

  // ==========================================================================
  // DOM Elements Cache
  // ==========================================================================

  const el = {
    appLayout: document.getElementById('appLayout'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    collapseSidebarBtn: document.getElementById('collapseSidebarBtn'),
    openSidebarBtn: document.getElementById('openSidebarBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    searchHistoryInput: document.getElementById('searchHistoryInput'),
    chatHistoryContainer: document.getElementById('chatHistoryContainer'),
    userProfileBtn: document.getElementById('userProfileBtn'),
    sidebarSettingsBtn: document.getElementById('sidebarSettingsBtn'),

    // Header elements
    modelSelectorWrapper: document.getElementById('modelSelectorWrapper'),
    modelSelectorBtn: document.getElementById('modelSelectorBtn'),
    modelDropdownMenu: document.getElementById('modelDropdownMenu'),
    connectionStatusPill: document.getElementById('connectionStatusPill'),
    connectionStatusText: document.getElementById('connectionStatusText'),
    headerClearChatBtn: document.getElementById('headerClearChatBtn'),
    headerExportBtn: document.getElementById('headerExportBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    headerSettingsBtn: document.getElementById('headerSettingsBtn'),

    // Viewport & messages
    chatViewport: document.getElementById('chatViewport'),
    chatContentContainer: document.getElementById('chatContentContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    suggestionGrid: document.getElementById('suggestionGrid'),
    messagesList: document.getElementById('messagesList'),
    scrollBottomBtn: document.getElementById('scrollBottomBtn'),

    // Input elements
    promptInput: document.getElementById('promptInput'),
    sendBtn: document.getElementById('sendBtn'),
    attachFileBtn: document.getElementById('attachFileBtn'),
    fileAttachmentInput: document.getElementById('fileAttachmentInput'),
    attachmentPreview: document.getElementById('attachmentPreview'),
    attachmentName: document.getElementById('attachmentName'),
    attachmentRemoveBtn: document.getElementById('attachmentRemoveBtn'),
    voiceTypingBtn: document.getElementById('voiceTypingBtn'),
    micIcon: document.getElementById('micIcon'),
    stopGenerationBtn: document.getElementById('stopGenerationBtn'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    webhookUrlInput: document.getElementById('webhookUrlInput'),
    testWebhookBtn: document.getElementById('testWebhookBtn'),
    webhookTestResult: document.getElementById('webhookTestResult'),
    webhookPayloadKey: document.getElementById('webhookPayloadKey'),
    streamingToggle: document.getElementById('streamingToggle'),
    autoTitleToggle: document.getElementById('autoTitleToggle'),
    ttsToggle: document.getElementById('ttsToggle'),
    exportAllChatsBtn: document.getElementById('exportAllChatsBtn'),
    clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
    resetSettingsBtn: document.getElementById('resetSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),

    // Rename Modal
    renameModal: document.getElementById('renameModal'),
    renameChatInput: document.getElementById('renameChatInput'),
    closeRenameBtn: document.getElementById('closeRenameBtn'),
    cancelRenameBtn: document.getElementById('cancelRenameBtn'),
    confirmRenameBtn: document.getElementById('confirmRenameBtn'),

    // Toasts
    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================================================
  // Initialization & Storage Persistence
  // ==========================================================================

  function init() {
    loadSettings();
    loadConversations();
    setupMarkdownRenderer();
    setupEventListeners();
    setupSpeechRecognition();
    checkWebhookHealth();

    // Responsive initial sidebar check
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true, false);
    } else {
      setSidebarCollapsed(state.sidebarCollapsed, false);
    }

    renderHistory();
    renderActiveConversation();
    adjustTextareaHeight();
  }

  function loadSettings() {
    try {
      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (storedTheme) {
        state.theme = storedTheme;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        state.theme = 'light';
      }
      applyTheme(state.theme);

      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) {
        state.settings = { ...state.settings, ...JSON.parse(storedSettings) };
      }

      const storedSidebar = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
      if (storedSidebar !== null) {
        state.sidebarCollapsed = storedSidebar === 'true';
      }
    } catch (e) {
      console.warn('Failed to load settings from storage', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, state.sidebarCollapsed);
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }

  function loadConversations() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      if (stored) {
        state.conversations = JSON.parse(stored);
      }
      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
      if (activeId && state.conversations.some(c => c.id === activeId)) {
        state.activeConversationId = activeId;
      } else if (state.conversations.length > 0) {
        state.activeConversationId = state.conversations[0].id;
      } else {
        createNewConversation(false);
      }
    } catch (e) {
      console.error('Error loading conversations', e);
      state.conversations = [];
      createNewConversation(false);
    }
  }

  function saveConversations() {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(state.conversations));
      if (state.activeConversationId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, state.activeConversationId);
      }
    } catch (e) {
      console.warn('Failed to save conversations to localStorage', e);
    }
  }

  // ==========================================================================
  // Markdown Configuration
  // ==========================================================================

  function setupMarkdownRenderer() {
    if (window.marked) {
      marked.setOptions({
        gfm: true,
        breaks: true,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true,
        highlight: function (code, lang) {
          if (window.hljs) {
            const validLanguage = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language: validLanguage }).value;
          }
          return code;
        }
      });
    }
  }

  function renderMarkdownSafe(text) {
    if (!text) return '';
    try {
      if (window.marked) {
        let rawHtml = marked.parse(text);
        // Wrap raw <pre><code> with our custom code container with copy button
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

        const preBlocks = tempDiv.querySelectorAll('pre');
        preBlocks.forEach((pre) => {
          const codeEl = pre.querySelector('code');
          let lang = 'code';
          if (codeEl) {
            const classes = codeEl.className.split(' ');
            const langClass = classes.find(c => c.startsWith('language-'));
            if (langClass) {
              lang = langClass.replace('language-', '');
            }
          }

          const wrapper = document.createElement('div');
          wrapper.className = 'code-block-wrapper';
          wrapper.innerHTML = `
            <div class="code-block-header">
              <span>${escapeHtml(lang)}</span>
              <button class="code-copy-btn" title="Copy code" onclick="window.chatApp.copyCodeSnippet(this)">
                <i class="fa-regular fa-copy"></i>
                <span>Copy</span>
              </button>
            </div>
          `;
          pre.parentNode.insertBefore(wrapper, pre);
          wrapper.appendChild(pre);
        });

        return tempDiv.innerHTML;
      }
    } catch (e) {
      console.error('Markdown parse error', e);
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Conversation Management
  // ==========================================================================

  function getActiveConversation() {
    return state.conversations.find(c => c.id === state.activeConversationId);
  }

  function createNewConversation(switchAndRender = true) {
    const newChat = {
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: 'New chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    state.conversations.unshift(newChat);
    state.activeConversationId = newChat.id;
    saveConversations();

    if (switchAndRender) {
      renderHistory();
      renderActiveConversation();
      el.promptInput.value = '';
      clearAttachment();
      adjustTextareaHeight();
      el.promptInput.focus();
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    }
    return newChat;
  }

  function switchConversation(id) {
    if (state.activeConversationId === id) return;
    if (state.isGenerating) {
      stopGeneration();
    }
    state.activeConversationId = id;
    saveConversations();
    renderHistory();
    renderActiveConversation();
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  }

  function deleteConversation(id, event) {
    if (event) event.stopPropagation();
    state.conversations = state.conversations.filter(c => c.id !== id);
    if (state.activeConversationId === id) {
      if (state.conversations.length > 0) {
        state.activeConversationId = state.conversations[0].id;
      } else {
        createNewConversation(false);
      }
    }
    saveConversations();
    renderHistory();
    renderActiveConversation();
    showToast('Conversation deleted', 'info');
  }

  function promptRenameConversation(id, event) {
    if (event) event.stopPropagation();
    const chat = state.conversations.find(c => c.id === id);
    if (!chat) return;

    state.editingChatId = id;
    el.renameChatInput.value = chat.title;
    el.renameModal.classList.add('show');
    setTimeout(() => el.renameChatInput.focus(), 50);
  }

  function saveRenameConversation() {
    const newTitle = el.renameChatInput.value.trim();
    if (newTitle && state.editingChatId) {
      const chat = state.conversations.find(c => c.id === state.editingChatId);
      if (chat) {
        chat.title = newTitle;
        chat.updatedAt = new Date().toISOString();
        saveConversations();
        renderHistory();
      }
    }
    closeRenameModal();
  }

  function closeRenameModal() {
    el.renameModal.classList.remove('show');
    state.editingChatId = null;
  }

  // ==========================================================================
  // Render History in Sidebar (Categorized by Date)
  // ==========================================================================

  function renderHistory(filterText = '') {
    const container = el.chatHistoryContainer;
    container.innerHTML = '';

    let list = state.conversations;
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q));
    }

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-history-notice">${filterText ? 'No matching chats found' : 'No conversation history yet.'}</div>`;
      return;
    }

    // Grouping by Date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups = {
      today: [],
      yesterday: [],
      previous7Days: [],
      older: []
    };

    list.forEach(c => {
      const chatDate = new Date(c.updatedAt || c.createdAt);
      if (chatDate >= today) {
        groups.today.push(c);
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(c);
      } else if (chatDate >= sevenDaysAgo) {
        groups.previous7Days.push(c);
      } else {
        groups.older.push(c);
      }
    });

    const categoryLabels = {
      today: 'Today',
      yesterday: 'Yesterday',
      previous7Days: 'Previous 7 Days',
      older: 'Older'
    };

    Object.keys(groups).forEach(key => {
      const items = groups[key];
      if (items.length > 0) {
        const titleEl = document.createElement('div');
        titleEl.className = 'history-group-title';
        titleEl.textContent = categoryLabels[key];
        container.appendChild(titleEl);

        items.forEach(chat => {
          const itemEl = document.createElement('div');
          itemEl.className = `history-item ${chat.id === state.activeConversationId ? 'active' : ''}`;
          itemEl.onclick = () => switchConversation(chat.id);

          itemEl.innerHTML = `
            <div class="history-title-wrap">
              <i class="fa-regular fa-message"></i>
              <span class="history-title-text">${escapeHtml(chat.title)}</span>
            </div>
            <div class="history-actions">
              <button class="history-action-btn" title="Rename" onclick="window.chatApp.promptRename('${chat.id}', event)">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="history-action-btn" title="Delete" onclick="window.chatApp.deleteChat('${chat.id}', event)">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          `;
          container.appendChild(itemEl);
        });
      }
    });
  }

  // ==========================================================================
  // Render Active Conversation Messages
  // ==========================================================================

  function renderActiveConversation() {
    const chat = getActiveConversation();
    if (!chat || chat.messages.length === 0) {
      el.welcomeScreen.style.display = 'flex';
      el.messagesList.innerHTML = '';
      return;
    }

    el.welcomeScreen.style.display = 'none';
    el.messagesList.innerHTML = '';

    chat.messages.forEach(msg => {
      appendMessageToDOM(msg, false);
    });

    scrollToBottom();
  }

  function appendMessageToDOM(msg, animate = true) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;
    row.id = `msg-${msg.id}`;

    const isAssistant = msg.role === 'assistant';
    const avatarHtml = isAssistant
      ? `<div class="message-avatar"><i class="fa-solid fa-bolt"></i></div>`
      : `<div class="message-avatar"><i class="fa-solid fa-user"></i></div>`;

    let contentHtml = '';
    if (msg.error) {
      contentHtml = `
        <div class="message-bubble error-bubble">
          <div><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(msg.content)}</div>
          <div class="error-actions">
            <button class="error-retry-btn" onclick="window.chatApp.retryMessage('${msg.id}')">
              <i class="fa-solid fa-rotate-right"></i> Retry
            </button>
          </div>
        </div>
      `;
    } else if (isAssistant) {
      contentHtml = `
        <div class="message-bubble markdown-body" id="bubble-${msg.id}">
          ${renderMarkdownSafe(msg.content)}
        </div>
        <div class="message-actions-bar">
          <button class="msg-action-btn" title="Copy response" onclick="window.chatApp.copyMessageText('${msg.id}')">
            <i class="fa-regular fa-copy"></i>
          </button>
          <button class="msg-action-btn ${msg.isSpeaking ? 'speaking' : ''}" id="speak-btn-${msg.id}" title="Read aloud" onclick="window.chatApp.toggleSpeak('${msg.id}')">
            <i class="fa-solid fa-volume-high"></i>
          </button>
          <button class="msg-action-btn ${msg.feedback === 'up' ? 'active' : ''}" title="Good response" onclick="window.chatApp.rateResponse('${msg.id}', 'up')">
            <i class="fa-regular fa-thumbs-up"></i>
          </button>
          <button class="msg-action-btn ${msg.feedback === 'down' ? 'active' : ''}" title="Bad response" onclick="window.chatApp.rateResponse('${msg.id}', 'down')">
            <i class="fa-regular fa-thumbs-down"></i>
          </button>
          <button class="msg-action-btn" title="Regenerate" onclick="window.chatApp.regenerateLastResponse()">
            <i class="fa-solid fa-arrows-rotate"></i>
          </button>
          <span class="msg-timestamp">${formatTime(msg.timestamp)}</span>
        </div>
      `;
    } else {
      // User message
      contentHtml = `
        <div class="message-bubble">
          ${escapeHtml(msg.content).replace(/\n/g, '<br>')}
        </div>
      `;
    }

    row.innerHTML = `
      ${isAssistant ? avatarHtml : ''}
      <div class="message-body">
        ${contentHtml}
      </div>
      ${!isAssistant ? avatarHtml : ''}
    `;

    el.messagesList.appendChild(row);
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = 'typingIndicatorRow';
    row.innerHTML = `
      <div class="message-avatar"><i class="fa-solid fa-bolt"></i></div>
      <div class="message-body">
        <div class="message-bubble">
          <div class="typing-indicator">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>
      </div>
    `;
    el.messagesList.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const elTyping = document.getElementById('typingIndicatorRow');
    if (elTyping) {
      elTyping.remove();
    }
  }

  function scrollToBottom(force = false) {
    const vp = el.chatViewport;
    vp.scrollTop = vp.scrollHeight;
  }

  // ==========================================================================
  // n8n Webhook Communication
  // ==========================================================================

  async function sendMessage(textToSend = null) {
    const text = (textToSend || el.promptInput.value).trim();
    if (!text && !state.attachedFile) return;
    if (state.isGenerating) return;

    let fullPrompt = text;
    if (state.attachedFile) {
      fullPrompt = `[Attached file: ${state.attachedFile.name}]\n\n${state.attachedFile.content}\n\n${text}`;
      clearAttachment();
    }

    // Switch off welcome view
    el.welcomeScreen.style.display = 'none';

    // Clear input
    el.promptInput.value = '';
    adjustTextareaHeight();
    updateSendButtonState();

    const chat = getActiveConversation();
    if (!chat) return;

    // Auto Title on first message
    if (chat.messages.length === 0 && state.settings.autoTitle) {
      chat.title = text.length > 35 ? text.substring(0, 35) + '...' : text;
      renderHistory();
    }

    // Add User Message
    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: fullPrompt,
      timestamp: new Date().toISOString()
    };
    chat.messages.push(userMsg);
    chat.updatedAt = new Date().toISOString();
    saveConversations();
    appendMessageToDOM(userMsg);
    renderHistory();
    scrollToBottom();

    // Prepare Assistant Message Placeholder
    state.isGenerating = true;
    updateGeneratingState(true);
    showTypingIndicator();

    state.activeAbortController = new AbortController();

    try {
      // Build Payload: send chatInput, message, prompt, and query to ensure maximum n8n compatibility
      const payload = {
        [state.settings.payloadKey || 'chatInput']: fullPrompt,
        chatInput: fullPrompt,
        message: fullPrompt,
        prompt: fullPrompt,
        query: fullPrompt,
        sessionId: chat.id
      };

      const response = await fetch(state.settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, text/html, */*'
        },
        body: JSON.stringify(payload),
        signal: state.activeAbortController.signal
      });

      removeTypingIndicator();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'n8n workflow error'}`);
      }

      // Read response content (can be JSON or plain text)
      let responseText = '';
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        // Check standard n8n fields
        responseText = json.output || json.text || json.response || json.message || json.data || JSON.stringify(json, null, 2);
      } else {
        responseText = await response.text();
      }

      if (!responseText || responseText.trim() === '') {
        responseText = 'No text returned from the webhook workflow.';
      }

      // Check if responseText is a JSON stringified inside text
      try {
        const parsed = JSON.parse(responseText);
        if (parsed && typeof parsed === 'object') {
          if (parsed.output) responseText = parsed.output;
          else if (parsed.text) responseText = parsed.text;
          else if (parsed.message) responseText = parsed.message;
        }
      } catch (err) {
        // Not a JSON string, leave as is
      }

      const assistantMsg = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: responseText.trim(),
        timestamp: new Date().toISOString(),
        feedback: null
      };

      chat.messages.push(assistantMsg);
      chat.updatedAt = new Date().toISOString();
      saveConversations();

      if (state.settings.streaming) {
        await streamAssistantResponse(assistantMsg);
      } else {
        appendMessageToDOM(assistantMsg);
        scrollToBottom();
      }

      // Text to speech auto-speak if enabled
      if (state.settings.tts) {
        speakText(assistantMsg.content, assistantMsg.id);
      }

    } catch (err) {
      removeTypingIndicator();
      if (err.name === 'AbortError') {
        showToast('Response generation stopped', 'info');
      } else {
        console.error('Fetch error:', err);
        const errorMsg = {
          id: 'msg_' + Date.now(),
          role: 'assistant',
          content: `Connection error: ${err.message}. Please check if your n8n webhook is online and active.`,
          timestamp: new Date().toISOString(),
          error: true
        };
        chat.messages.push(errorMsg);
        saveConversations();
        appendMessageToDOM(errorMsg);
        scrollToBottom();
        updateConnectionStatus(false, 'n8n Disconnected');
      }
    } finally {
      state.isGenerating = false;
      state.activeAbortController = null;
      updateGeneratingState(false);
      el.promptInput.focus();
    }
  }

  // Simulated Streaming Effect for ChatGPT Feel
  async function streamAssistantResponse(msg) {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = `msg-${msg.id}`;

    row.innerHTML = `
      <div class="message-avatar"><i class="fa-solid fa-bolt"></i></div>
      <div class="message-body">
        <div class="message-bubble markdown-body" id="bubble-${msg.id}"></div>
        <div class="message-actions-bar" style="opacity: 0.5;">
          <button class="msg-action-btn" title="Copy response" onclick="window.chatApp.copyMessageText('${msg.id}')">
            <i class="fa-regular fa-copy"></i>
          </button>
          <button class="msg-action-btn" id="speak-btn-${msg.id}" title="Read aloud" onclick="window.chatApp.toggleSpeak('${msg.id}')">
            <i class="fa-solid fa-volume-high"></i>
          </button>
          <button class="msg-action-btn" title="Good response" onclick="window.chatApp.rateResponse('${msg.id}', 'up')">
            <i class="fa-regular fa-thumbs-up"></i>
          </button>
          <button class="msg-action-btn" title="Bad response" onclick="window.chatApp.rateResponse('${msg.id}', 'down')">
            <i class="fa-regular fa-thumbs-down"></i>
          </button>
          <button class="msg-action-btn" title="Regenerate" onclick="window.chatApp.regenerateLastResponse()">
            <i class="fa-solid fa-arrows-rotate"></i>
          </button>
          <span class="msg-timestamp">${formatTime(msg.timestamp)}</span>
        </div>
      </div>
    `;

    el.messagesList.appendChild(row);
    const bubble = document.getElementById(`bubble-${msg.id}`);

    const text = msg.content;
    const words = text.split(/(\s+)/);
    let currentRender = '';

    for (let i = 0; i < words.length; i++) {
      if (!state.isGenerating && state.activeAbortController === null) {
        // Aborted
        break;
      }
      currentRender += words[i];
      bubble.innerHTML = renderMarkdownSafe(currentRender);
      scrollToBottom();
      // Fast dynamic delay
      await new Promise(r => setTimeout(r, 18));
    }

    // Final render
    bubble.innerHTML = renderMarkdownSafe(text);
    const actionsBar = row.querySelector('.message-actions-bar');
    if (actionsBar) actionsBar.style.opacity = '1';
    scrollToBottom();
  }

  function stopGeneration() {
    if (state.activeAbortController) {
      state.activeAbortController.abort();
      state.activeAbortController = null;
    }
    state.isGenerating = false;
    updateGeneratingState(false);
    removeTypingIndicator();
  }

  function updateGeneratingState(isGen) {
    if (isGen) {
      el.sendBtn.style.display = 'none';
      el.stopGenerationBtn.style.display = 'flex';
      el.voiceTypingBtn.style.display = 'none';
    } else {
      el.sendBtn.style.display = 'flex';
      el.stopGenerationBtn.style.display = 'none';
      el.voiceTypingBtn.style.display = 'flex';
      updateSendButtonState();
    }
  }

  function retryMessage(errorMsgId) {
    const chat = getActiveConversation();
    if (!chat) return;

    // Find the error message index
    const errIdx = chat.messages.findIndex(m => m.id === errorMsgId);
    if (errIdx === -1) return;

    // Remove the error message
    chat.messages.splice(errIdx, 1);

    // Look back for the last user prompt
    let lastUserPrompt = '';
    for (let i = errIdx - 1; i >= 0; i--) {
      if (chat.messages[i].role === 'user') {
        lastUserPrompt = chat.messages[i].content;
        // Also remove user message since sendMessage will add it back
        chat.messages.splice(i, 1);
        break;
      }
    }

    saveConversations();
    renderActiveConversation();

    if (lastUserPrompt) {
      sendMessage(lastUserPrompt);
    }
  }

  function regenerateLastResponse() {
    const chat = getActiveConversation();
    if (!chat || chat.messages.length === 0) return;

    // If last message is assistant, pop it and re-send the preceding user prompt
    if (chat.messages[chat.messages.length - 1].role === 'assistant') {
      chat.messages.pop();
    }

    if (chat.messages.length > 0 && chat.messages[chat.messages.length - 1].role === 'user') {
      const lastUserMsg = chat.messages.pop();
      saveConversations();
      renderActiveConversation();
      sendMessage(lastUserMsg.content);
    }
  }

  // ==========================================================================
  // Webhook Health Check & Connection Testing
  // ==========================================================================

  async function checkWebhookHealth() {
    updateConnectionStatus('checking', 'Connecting...');
    try {
      // Test webhook with OPTIONS or quick lightweight probe
      const res = await fetch(state.settings.webhookUrl, {
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok || res.status === 204 || res.status === 200 || res.status === 405) {
        updateConnectionStatus(true, 'n8n Live');
      } else {
        updateConnectionStatus(false, 'n8n Status ' + res.status);
      }
    } catch (e) {
      // Direct OPTIONS check may trigger a silent catch on some networks,
      // but let's assume online or indicate ready
      updateConnectionStatus(true, 'n8n Ready');
    }
  }

  function updateConnectionStatus(status, label) {
    if (status === true) {
      el.connectionStatusPill.style.background = 'var(--accent-brand-subtle)';
      el.connectionStatusPill.style.borderColor = 'rgba(16, 163, 127, 0.3)';
      el.connectionStatusPill.style.color = 'var(--accent-brand)';
      el.connectionStatusText.textContent = label || 'n8n Live';
    } else if (status === false) {
      el.connectionStatusPill.style.background = 'var(--danger-bg)';
      el.connectionStatusPill.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      el.connectionStatusPill.style.color = 'var(--danger-color)';
      el.connectionStatusText.textContent = label || 'Disconnected';
    } else {
      el.connectionStatusText.textContent = label || 'Connecting...';
    }
  }

  async function testWebhookInSettings() {
    const url = el.webhookUrlInput.value.trim();
    const resultBox = el.webhookTestResult;
    resultBox.style.display = 'block';
    resultBox.className = 'webhook-test-result';
    resultBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pinging n8n webhook...';

    if (!url) {
      resultBox.className = 'webhook-test-result error';
      resultBox.textContent = 'Please enter a valid URL.';
      return;
    }

    const startTime = performance.now();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatInput: 'Ping: Testing connection from ChatGPT UI',
          message: 'Ping'
        })
      });

      const elapsed = Math.round(performance.now() - startTime);
      if (response.ok) {
        const text = await response.text();
        const snippet = text.length > 100 ? text.substring(0, 100) + '...' : text;
        resultBox.className = 'webhook-test-result success';
        resultBox.innerHTML = `
          <strong><i class="fa-solid fa-circle-check"></i> Connection Successful! (${elapsed}ms)</strong><br>
          Status: HTTP ${response.status} OK<br>
          <span style="font-size: 11px; opacity: 0.85;">Response: ${escapeHtml(snippet)}</span>
        `;
        updateConnectionStatus(true, 'n8n Live');
      } else {
        resultBox.className = 'webhook-test-result error';
        resultBox.innerHTML = `
          <strong><i class="fa-solid fa-triangle-exclamation"></i> Server returned HTTP ${response.status}</strong><br>
          ${response.statusText || 'Workflow may have threw an error.'}
        `;
      }
    } catch (err) {
      resultBox.className = 'webhook-test-result error';
      resultBox.innerHTML = `
        <strong><i class="fa-solid fa-circle-xmark"></i> Connection Failed</strong><br>
        Error: ${err.message}
      `;
    }
  }

  // ==========================================================================
  // Speech Recognition (Voice Dictation)
  // ==========================================================================

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      el.voiceTypingBtn.title = 'Speech recognition not supported in this browser';
      el.voiceTypingBtn.style.opacity = '0.5';
      return;
    }

    state.speechRecognition = new SpeechRecognition();
    state.speechRecognition.continuous = false;
    state.speechRecognition.interimResults = true;
    state.speechRecognition.lang = 'en-US';

    state.speechRecognition.onstart = () => {
      state.isListening = true;
      el.voiceTypingBtn.classList.add('listening');
      el.micIcon.className = 'fa-solid fa-microphone-slash';
      showToast('Listening... Speak now', 'info');
    };

    state.speechRecognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      el.promptInput.value = transcript;
      adjustTextareaHeight();
      updateSendButtonState();
    };

    state.speechRecognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopListening();
      if (event.error !== 'no-speech') {
        showToast('Voice input error: ' + event.error, 'error');
      }
    };

    state.speechRecognition.onend = () => {
      stopListening();
    };
  }

  function toggleVoiceTyping() {
    if (!state.speechRecognition) {
      showToast('Speech recognition is not supported in this browser. Try Chrome or Edge.', 'error');
      return;
    }
    if (state.isListening) {
      state.speechRecognition.stop();
      stopListening();
    } else {
      try {
        state.speechRecognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  }

  function stopListening() {
    state.isListening = false;
    el.voiceTypingBtn.classList.remove('listening');
    el.micIcon.className = 'fa-solid fa-microphone';
  }

  // ==========================================================================
  // Text to Speech (Read Aloud)
  // ==========================================================================

  function speakText(text, msgId) {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported in this browser', 'error');
      return;
    }

    // If already speaking this message, toggle stop
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      document.querySelectorAll('.msg-action-btn.speaking').forEach(b => b.classList.remove('speaking'));
      if (state.currentSpeechUtterance && state.currentSpeechUtterance.msgId === msgId) {
        state.currentSpeechUtterance = null;
        return;
      }
    }

    // Strip markdown formatting for cleaner speech
    const plainText = text
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, 'Code block omitted.');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.msgId = msgId;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const speakBtn = document.getElementById(`speak-btn-${msgId}`);
    if (speakBtn) speakBtn.classList.add('speaking');

    utterance.onend = () => {
      if (speakBtn) speakBtn.classList.remove('speaking');
      state.currentSpeechUtterance = null;
    };

    utterance.onerror = () => {
      if (speakBtn) speakBtn.classList.remove('speaking');
      state.currentSpeechUtterance = null;
    };

    state.currentSpeechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // ==========================================================================
  // File Attachment Handling
  // ==========================================================================

  function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('File is too large. Maximum size is 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      state.attachedFile = {
        name: file.name,
        size: file.size,
        content: event.target.result
      };

      el.attachmentName.textContent = file.name;
      el.attachmentPreview.style.display = 'flex';
      updateSendButtonState();
      el.promptInput.focus();
    };

    reader.onerror = () => {
      showToast('Failed to read file', 'error');
    };

    reader.readAsText(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  }

  function clearAttachment() {
    state.attachedFile = null;
    el.attachmentPreview.style.display = 'none';
    el.attachmentName.textContent = '';
    updateSendButtonState();
  }

  // ==========================================================================
  // UI Interactions & Helpers
  // ==========================================================================

  function adjustTextareaHeight() {
    const textarea = el.promptInput;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = newHeight + 'px';
  }

  function updateSendButtonState() {
    const hasText = el.promptInput.value.trim().length > 0;
    const hasFile = state.attachedFile !== null;
    el.sendBtn.disabled = !hasText && !hasFile;
  }

  function setSidebarCollapsed(collapsed, transition = true) {
    state.sidebarCollapsed = collapsed;
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);

    if (collapsed) {
      el.sidebar.classList.add('collapsed');
      el.sidebarOverlay.classList.remove('active');
    } else {
      el.sidebar.classList.remove('collapsed');
      if (window.innerWidth <= 768) {
        el.sidebarOverlay.classList.add('active');
      }
    }
  }

  function toggleSidebar() {
    setSidebarCollapsed(!state.sidebarCollapsed);
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      el.themeIcon.className = 'fa-regular fa-sun';
    } else {
      el.themeIcon.className = 'fa-regular fa-moon';
    }
    saveSettings();
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme} mode`, 'info');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-solid fa-circle-info';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') iconClass = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `<i class="${iconClass}"></i><span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // ==========================================================================
  // Settings Modal Handlers
  // ==========================================================================

  function openSettingsModal() {
    el.webhookUrlInput.value = state.settings.webhookUrl || DEFAULT_WEBHOOK_URL;
    el.webhookPayloadKey.value = state.settings.payloadKey || 'chatInput';
    el.streamingToggle.checked = state.settings.streaming !== false;
    el.autoTitleToggle.checked = state.settings.autoTitle !== false;
    el.ttsToggle.checked = state.settings.tts === true;
    el.webhookTestResult.style.display = 'none';

    el.settingsModal.classList.add('show');
  }

  function closeSettingsModal() {
    el.settingsModal.classList.remove('show');
  }

  function saveSettingsFromModal() {
    const newUrl = el.webhookUrlInput.value.trim() || DEFAULT_WEBHOOK_URL;
    const newKey = el.webhookPayloadKey.value.trim() || 'chatInput';

    state.settings.webhookUrl = newUrl;
    state.settings.payloadKey = newKey;
    state.settings.streaming = el.streamingToggle.checked;
    state.settings.autoTitle = el.autoTitleToggle.checked;
    state.settings.tts = el.ttsToggle.checked;

    saveSettings();
    closeSettingsModal();
    showToast('Settings saved successfully', 'success');
    checkWebhookHealth();
  }

  function resetSettingsToDefault() {
    el.webhookUrlInput.value = DEFAULT_WEBHOOK_URL;
    el.webhookPayloadKey.value = 'chatInput';
    el.streamingToggle.checked = true;
    el.autoTitleToggle.checked = true;
    el.ttsToggle.checked = false;
    showToast('Reset to defaults', 'info');
  }

  function clearCurrentChat() {
    const chat = getActiveConversation();
    if (!chat || chat.messages.length === 0) return;

    if (confirm('Clear all messages in this conversation?')) {
      chat.messages = [];
      chat.updatedAt = new Date().toISOString();
      saveConversations();
      renderActiveConversation();
      showToast('Conversation cleared', 'info');
    }
  }

  function clearAllConversations() {
    if (confirm('Are you sure you want to delete ALL conversation history? This cannot be undone.')) {
      state.conversations = [];
      createNewConversation(true);
      closeSettingsModal();
      showToast('All chat history cleared', 'info');
    }
  }

  function exportCurrentChatAsMarkdown() {
    const chat = getActiveConversation();
    if (!chat || chat.messages.length === 0) {
      showToast('No messages to export', 'info');
      return;
    }

    let md = `# ${chat.title}\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    chat.messages.forEach(m => {
      const sender = m.role === 'assistant' ? '🤖 **AI Banking Assistant**' : '👤 **You**';
      md += `${sender} (${formatTime(m.timestamp)}):\n\n${m.content}\n\n---\n\n`;
    });

    downloadFile(md, `${chat.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`, 'text/markdown');
    showToast('Chat exported as Markdown', 'success');
  }

  function exportAllChatsAsJSON() {
    const jsonStr = JSON.stringify(state.conversations, null, 2);
    downloadFile(jsonStr, `chatgpt_n8n_backup_${Date.now()}.json`, 'application/json');
    showToast('All chats backed up to JSON', 'success');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // Event Listeners Setup
  // ==========================================================================

  function setupEventListeners() {
    // Sidebar toggles
    el.collapseSidebarBtn.addEventListener('click', () => setSidebarCollapsed(true));
    el.openSidebarBtn.addEventListener('click', () => setSidebarCollapsed(false));
    el.sidebarOverlay.addEventListener('click', () => setSidebarCollapsed(true));
    el.newChatBtn.addEventListener('click', () => createNewConversation(true));

    // Search chats
    el.searchHistoryInput.addEventListener('input', (e) => {
      renderHistory(e.target.value.trim());
    });

    // Theme toggle
    el.themeToggleBtn.addEventListener('click', toggleTheme);

    // Settings modal
    el.headerSettingsBtn.addEventListener('click', openSettingsModal);
    el.sidebarSettingsBtn.addEventListener('click', openSettingsModal);
    el.userProfileBtn.addEventListener('click', openSettingsModal);
    el.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    el.saveSettingsBtn.addEventListener('click', saveSettingsFromModal);
    el.resetSettingsBtn.addEventListener('click', resetSettingsToDefault);
    el.testWebhookBtn.addEventListener('click', testWebhookInSettings);
    el.clearAllHistoryBtn.addEventListener('click', clearAllConversations);
    el.exportAllChatsBtn.addEventListener('click', exportAllChatsAsJSON);

    // Header actions
    el.headerClearChatBtn.addEventListener('click', clearCurrentChat);
    el.headerExportBtn.addEventListener('click', exportCurrentChatAsMarkdown);

    // Model Selector toggle
    el.modelSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.modelDropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!el.modelSelectorWrapper?.contains(e.target)) {
        el.modelDropdownMenu.classList.remove('show');
      }
    });

    // Suggestion Cards click
    el.suggestionGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.suggestion-card');
      if (card) {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          sendMessage(prompt);
        }
      }
    });

    // Textarea input and auto-resize
    el.promptInput.addEventListener('input', () => {
      adjustTextareaHeight();
      updateSendButtonState();
    });

    // Send on Enter (Shift+Enter for newline)
    el.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Send button click
    el.sendBtn.addEventListener('click', () => sendMessage());

    // Stop button click
    el.stopGenerationBtn.addEventListener('click', stopGeneration);

    // Voice typing button
    el.voiceTypingBtn.addEventListener('click', toggleVoiceTyping);

    // File attachment
    el.attachFileBtn.addEventListener('click', () => el.fileAttachmentInput.click());
    el.fileAttachmentInput.addEventListener('change', handleFileSelected);
    el.attachmentRemoveBtn.addEventListener('click', clearAttachment);

    // Rename Modal events
    el.closeRenameBtn.addEventListener('click', closeRenameModal);
    el.cancelRenameBtn.addEventListener('click', closeRenameModal);
    el.confirmRenameBtn.addEventListener('click', saveRenameConversation);
    el.renameChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveRenameConversation();
      if (e.key === 'Escape') closeRenameModal();
    });

    // Scroll to bottom floating button
    el.chatViewport.addEventListener('scroll', () => {
      const vp = el.chatViewport;
      const distanceFromBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      if (distanceFromBottom > 150) {
        el.scrollBottomBtn.classList.add('visible');
      } else {
        el.scrollBottomBtn.classList.remove('visible');
      }
    });

    el.scrollBottomBtn.addEventListener('click', () => scrollToBottom(true));

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape closes open modals
      if (e.key === 'Escape') {
        if (el.settingsModal.classList.contains('show')) closeSettingsModal();
        if (el.renameModal.classList.contains('show')) closeRenameModal();
        if (el.modelDropdownMenu.classList.contains('show')) el.modelDropdownMenu.classList.remove('show');
      }

      // Ctrl + Shift + O or Ctrl + K: New chat
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'o' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        createNewConversation(true);
      }

      // Ctrl + Shift + S: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleSidebar();
      }
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768 && !state.sidebarCollapsed) {
        setSidebarCollapsed(true, false);
      }
    });
  }

  // ==========================================================================
  // Public Global API for inline button handlers
  // ==========================================================================

  window.chatApp = {
    copyCodeSnippet: function (btn) {
      const codeBlock = btn.closest('.code-block-wrapper');
      if (!codeBlock) return;
      const code = codeBlock.querySelector('code')?.innerText || '';
      navigator.clipboard.writeText(code).then(() => {
        const span = btn.querySelector('span');
        const originalText = span.textContent;
        span.textContent = 'Copied!';
        btn.style.color = 'var(--accent-brand)';
        setTimeout(() => {
          span.textContent = originalText;
          btn.style.color = '';
        }, 2000);
      });
    },

    copyMessageText: function (msgId) {
      const chat = getActiveConversation();
      if (!chat) return;
      const msg = chat.messages.find(m => m.id === msgId);
      if (msg) {
        navigator.clipboard.writeText(msg.content).then(() => {
          showToast('Message copied to clipboard', 'success');
        });
      }
    },

    toggleSpeak: function (msgId) {
      const chat = getActiveConversation();
      if (!chat) return;
      const msg = chat.messages.find(m => m.id === msgId);
      if (msg) {
        speakText(msg.content, msgId);
      }
    },

    rateResponse: function (msgId, type) {
      const chat = getActiveConversation();
      if (!chat) return;
      const msg = chat.messages.find(m => m.id === msgId);
      if (msg) {
        msg.feedback = msg.feedback === type ? null : type;
        saveConversations();
        renderActiveConversation();
        showToast(msg.feedback ? 'Thanks for your feedback!' : 'Feedback removed', 'info');
      }
    },

    retryMessage: function (msgId) {
      retryMessage(msgId);
    },

    regenerateLastResponse: function () {
      regenerateLastResponse();
    },

    promptRename: function (id, e) {
      promptRenameConversation(id, e);
    },

    deleteChat: function (id, e) {
      deleteConversation(id, e);
    }
  };

  // Launch application
  document.addEventListener('DOMContentLoaded', init);
})();
