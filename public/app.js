// State variables
let activeTab = 'search';
let activeRightTab = 'summary';
let geminiKey = '';
let geminiModel = 'gemini-1.5-flash';
let selectedVideo = null;
let currentTranscript = null;
let chatHistory = [];

// Initialize application on load
window.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  checkCookiesStatus();
  lucide.createIcons();
  
  // Connect forms
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.focus();
  }
});

// Switch Main Navigation Tabs
function switchTab(tabName) {
  activeTab = tabName;
  
  // Update nav buttons active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  // Toggle tab sections visibility
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.add('hidden');
  });
  const activeSection = document.getElementById(`tab-${tabName}`);
  if (activeSection) activeSection.classList.remove('hidden');
  
  if (tabName === 'settings') {
    checkCookiesStatus();
  }
  
  lucide.createIcons();
}

// Switch Right Tab (Summary vs Transcript vs Clipper in workspace)
function switchRightTab(tabName) {
  activeRightTab = tabName;
  
  const summaryBtn = document.getElementById('tab-summary-btn');
  const transcriptBtn = document.getElementById('tab-transcript-btn');
  const clipperBtn = document.getElementById('tab-clipper-btn');
  
  const summaryPane = document.getElementById('right-tab-summary');
  const transcriptPane = document.getElementById('right-tab-transcript');
  const clipperPane = document.getElementById('right-tab-clipper');
  
  // Reset active classes
  summaryBtn.className = "text-sm font-semibold text-zinc-400 hover:text-zinc-200 pb-2 transition-all";
  transcriptBtn.className = "text-sm font-semibold text-zinc-400 hover:text-zinc-200 pb-2 relative transition-all";
  clipperBtn.className = "text-sm font-semibold text-zinc-400 hover:text-zinc-200 pb-2 relative transition-all";
  
  summaryPane.classList.add('hidden');
  transcriptPane.classList.add('hidden');
  clipperPane.classList.add('hidden');
  
  if (tabName === 'summary') {
    summaryBtn.className = "text-sm font-semibold text-white border-b-2 border-red-500 pb-2 relative transition-all";
    summaryPane.classList.remove('hidden');
  } else if (tabName === 'transcript') {
    transcriptBtn.className = "text-sm font-semibold text-white border-b-2 border-red-500 pb-2 relative transition-all";
    transcriptPane.classList.remove('hidden');
    renderTranscriptSegments();
  } else if (tabName === 'clipper') {
    clipperBtn.className = "text-sm font-semibold text-white border-b-2 border-red-500 pb-2 relative transition-all";
    clipperPane.classList.remove('hidden');
  }
}

// Load configurations from LocalStorage
async function loadSettings() {
  geminiKey = localStorage.getItem('gemini_api_key') || '';
  geminiModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
  
  try {
    const configRes = await fetch('/api/config');
    if (configRes.ok) {
      const configData = await configRes.json();
      if (configData.geminiApiKey) {
        console.log('[Config] Loaded Gemini API key from server environment.');
        geminiKey = configData.geminiApiKey;
      }
    }
  } catch (error) {
    console.error('Error loading server configuration:', error);
  }
  
  const keyInput = document.getElementById('gemini-key-input');
  const modelSelect = document.getElementById('gemini-model-select');
  const customInput = document.getElementById('gemini-model-custom');
  const customContainer = document.getElementById('custom-model-container');
  
  if (keyInput) keyInput.value = geminiKey;
  
  if (modelSelect) {
    const defaultOptions = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    if (defaultOptions.includes(geminiModel)) {
      modelSelect.value = geminiModel;
      if (customContainer) customContainer.classList.add('hidden');
    } else {
      modelSelect.value = 'custom';
      if (customInput) customInput.value = geminiModel;
      if (customContainer) customContainer.classList.remove('hidden');
    }
  }
  
  updateKeyBadge();
  if (geminiKey) {
    fetchAvailableModels(geminiKey);
  }
}

// Save Settings to LocalStorage
function saveSettings() {
  const keyInput = document.getElementById('gemini-key-input');
  const modelSelect = document.getElementById('gemini-model-select');
  const customInput = document.getElementById('gemini-model-custom');
  
  geminiKey = keyInput ? keyInput.value.trim() : '';
  
  if (modelSelect) {
    if (modelSelect.value === 'custom') {
      geminiModel = customInput ? customInput.value.trim() : 'gemini-1.5-flash';
    } else {
      geminiModel = modelSelect.value;
    }
  } else {
    geminiModel = 'gemini-1.5-flash';
  }
  
  localStorage.setItem('gemini_api_key', geminiKey);
  localStorage.setItem('gemini_model', geminiModel);
  
  updateKeyBadge();
  alert('Settings saved successfully!');
  switchTab('search');
}

// Update API status badge at top right
function updateKeyBadge() {
  const badge = document.getElementById('key-badge');
  const statusDot = document.getElementById('key-status-dot');
  const statusText = document.getElementById('key-status-text');
  
  if (geminiKey) {
    statusDot.className = "w-2 h-2 rounded-full bg-green-500";
    statusText.innerText = "Gemini Key Active";
    badge.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-950/20 text-green-400 text-xs font-semibold cursor-pointer transition-all hover:bg-green-950/30";
  } else {
    statusDot.className = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
    statusText.innerText = "Gemini Key Inactive";
    badge.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full border border-red-500/20 bg-red-950/20 text-red-400 text-xs font-semibold cursor-pointer transition-all hover:bg-red-950/30";
  }
}

// Toggle Visibility of the API key input field
function toggleKeyVisibility() {
  const keyInput = document.getElementById('gemini-key-input');
  const visibilityIcon = document.getElementById('key-visibility-icon');
  
  if (keyInput.type === 'password') {
    keyInput.type = 'text';
    visibilityIcon.setAttribute('data-lucide', 'eye-off');
  } else {
    keyInput.type = 'password';
    visibilityIcon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

// Test Key Connection with a lightweight Gemini REST call (fetching models list)
async function testApiKey() {
  const keyInput = document.getElementById('gemini-key-input');
  const testingKey = keyInput ? keyInput.value.trim() : '';
  const spinner = document.getElementById('test-key-spinner');
  
  if (!testingKey) {
    alert('Please enter an API Key to test.');
    return;
  }
  
  spinner.classList.add('animate-spin');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${testingKey}`);
    const data = await response.json();
    spinner.classList.remove('animate-spin');
    
    if (response.ok && data.models) {
      const generateModels = data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => ({
          id: m.name.replace('models/', ''),
          displayName: m.displayName || m.name.replace('models/', '')
        }));
      
      updateModelDropdown(generateModels);
      alert(`Success! Retrieved ${generateModels.length} compatible models. Your settings dropdown has been updated with the models supported by your API key.`);
    } else {
      const errorMsg = data.error ? data.error.message : 'Unknown authentication error';
      alert('Failed: ' + errorMsg);
    }
  } catch (error) {
    spinner.classList.remove('animate-spin');
    alert('Connection error: ' + error.message);
  }
}

// Fetch all available models in the background
async function fetchAvailableModels(key) {
  if (!key) return;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
    if (response.ok) {
      const data = await response.json();
      if (data.models) {
        const generateModels = data.models
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => ({
            id: m.name.replace('models/', ''),
            displayName: m.displayName || m.name.replace('models/', '')
          }));
        updateModelDropdown(generateModels);
      }
    }
  } catch (e) {
    console.error('Failed to pre-fetch models:', e);
  }
}

// Toggle visibility of custom model ID container
function handleModelSelectChange() {
  const modelSelect = document.getElementById('gemini-model-select');
  const customContainer = document.getElementById('custom-model-container');
  if (modelSelect && customContainer) {
    if (modelSelect.value === 'custom') {
      customContainer.classList.remove('hidden');
    } else {
      customContainer.classList.add('hidden');
    }
  }
}

// Dynamically populate options list in settings view
function updateModelDropdown(models) {
  const modelSelect = document.getElementById('gemini-model-select');
  const customInput = document.getElementById('gemini-model-custom');
  const customContainer = document.getElementById('custom-model-container');
  if (!modelSelect) return;
  
  const currentValue = modelSelect.value === 'custom' && customInput ? customInput.value.trim() : geminiModel;
  
  modelSelect.innerHTML = `
    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Extremely fast & cost-efficient)</option>
    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Best for complex reasoning across huge transcripts)</option>
    <option value="custom">Custom Model ID...</option>
  `;
  
  models.forEach(m => {
    if (m.id !== 'gemini-1.5-flash' && m.id !== 'gemini-1.5-pro') {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.innerText = `${m.displayName} (${m.id})`;
      modelSelect.insertBefore(opt, modelSelect.lastElementChild);
    }
  });
  
  const defaultOptions = ['gemini-1.5-flash', 'gemini-1.5-pro'];
  if (models.some(m => m.id === currentValue)) {
    modelSelect.value = currentValue;
    if (customContainer) customContainer.classList.add('hidden');
  } else if (defaultOptions.includes(currentValue)) {
    modelSelect.value = currentValue;
    if (customContainer) customContainer.classList.add('hidden');
  } else {
    modelSelect.value = 'custom';
    if (customInput) customInput.value = currentValue;
    if (customContainer) customContainer.classList.remove('hidden');
  }
}

// Handle Search Form Submission
async function handleSearchSubmit(e) {
  e.preventDefault();
  const query = document.getElementById('search-input').value.trim();
  const sort = document.getElementById('filter-sort').value;
  const duration = document.getElementById('filter-duration').value;
  
  if (!query) return;
  
  const resultsDiv = document.getElementById('search-results');
  const loadingDiv = document.getElementById('search-loading');
  
  resultsDiv.innerHTML = '';
  loadingDiv.classList.remove('hidden');
  
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&sortBy=${sort}&duration=${duration}`);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    
    loadingDiv.classList.add('hidden');
    
    if (!data.results || data.results.length === 0) {
      resultsDiv.innerHTML = `
        <div class="col-span-full py-12 text-center text-zinc-500">
          No results found. Try adjusting your query or filter settings.
        </div>
      `;
      return;
    }
    
    // Render Results
    data.results.forEach(item => {
      if (item.type === 'video') {
        const card = document.createElement('div');
        card.className = "glass-card rounded-2xl overflow-hidden flex flex-col h-full";
        card.innerHTML = `
          <div class="relative aspect-video w-full overflow-hidden bg-black flex-shrink-0 group">
            <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=400&auto=format&fit=crop'}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
            <span class="absolute bottom-2.5 right-2.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide">
              ${item.duration || '0:00'}
            </span>
          </div>
          <div class="p-4 flex flex-col flex-1 justify-between space-y-3">
            <div class="space-y-1.5">
              <h3 class="font-heading font-semibold text-sm text-zinc-100 line-clamp-2 hover:text-red-400 transition-colors cursor-pointer" onclick="loadVideo('${item.id}')">
                ${item.title}
              </h3>
              <p class="text-xs text-zinc-400 font-medium">${item.channel}</p>
              <div class="flex items-center text-[10px] text-zinc-500 font-medium space-x-1.5">
                <span>${item.views || 'No views'}</span>
                <span class="w-1 h-1 rounded-full bg-zinc-700"></span>
                <span>${item.published || 'recently'}</span>
              </div>
            </div>
            <button onclick="loadVideo('${item.id}')" class="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-red-500"></i>
              <span>Research Video</span>
            </button>
          </div>
        `;
        resultsDiv.appendChild(card);
      }
    });
    lucide.createIcons();
    
  } catch (error) {
    loadingDiv.classList.add('hidden');
    resultsDiv.innerHTML = `
      <div class="col-span-full py-12 text-center text-red-400">
        Error loading results: ${error.message}
      </div>
    `;
  }
}

// Handle Direct YouTube URL Input from Watch tab
function handleDirectUrlSubmit(e) {
  e.preventDefault();
  const urlInput = document.getElementById('direct-url-input').value.trim();
  const videoId = extractVideoId(urlInput);
  
  if (videoId) {
    loadVideo(videoId);
  } else {
    alert('Could not parse video ID. Please check the YouTube URL.');
  }
}

// Extract Video ID from YouTube URLs
function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Load Video into Watch/Analyze tab workspace
async function loadVideo(videoId) {
  selectedVideo = { id: videoId };
  
  // Show workspace panel, hide no-video prompt
  document.getElementById('no-video-container').classList.add('hidden');
  document.getElementById('video-workspace').classList.remove('hidden');
  
  // Update Iframe
  document.getElementById('video-iframe').src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
  
  // Reset outputs
  document.getElementById('workspace-video-title').innerText = "Loading details...";
  document.getElementById('workspace-video-channel').innerText = "";
  document.getElementById('summary-content').innerHTML = "";
  document.getElementById('summary-content').classList.add('hidden');
  document.getElementById('summary-empty').classList.remove('hidden');
  document.getElementById('summary-loading').classList.add('hidden');
  
  clearChat();
  currentTranscript = null;
  
  // Switch to Tab View
  switchTab('analyze');
  switchRightTab('summary');
  
  // Focus chat input
  setTimeout(() => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.focus();
  }, 150);
  
  // Load Video Metadata
  try {
    const metaResponse = await fetch(`/api/video-info?videoId=${videoId}`);
    if (metaResponse.ok) {
      const meta = await metaResponse.json();
      selectedVideo.title = meta.title;
      selectedVideo.channel = meta.channel;
      document.getElementById('workspace-video-title').innerText = meta.title;
      document.getElementById('workspace-video-channel').innerText = meta.channel;
    }
  } catch (err) {
    document.getElementById('workspace-video-title').innerText = `Video ID: ${videoId}`;
  }
  
  // Pre-load transcript in background for Q&A and segments tab
  fetchTranscript(videoId);
}

// Fetch Transcript from API
async function fetchTranscript(videoId) {
  const loading = document.getElementById('transcript-loading');
  const empty = document.getElementById('transcript-empty');
  const container = document.getElementById('transcript-segments');
  
  if (loading) loading.classList.remove('hidden');
  if (empty) empty.classList.add('hidden');
  if (container) container.classList.add('hidden');
  
  try {
    const response = await fetch(`/api/transcript?videoId=${videoId}`);
    if (!response.ok) throw new Error('Transcript not available');
    const data = await response.json();
    currentTranscript = data;
    
    if (loading) loading.classList.add('hidden');
    if (container) container.classList.remove('hidden');
    
    renderTranscriptSegments();
  } catch (error) {
    if (loading) loading.classList.add('hidden');
    if (empty) {
      empty.innerText = "No subtitles or transcripts are available for this video.";
      empty.classList.remove('hidden');
    }
  }
}

// Render Transcript Segments in browser
function renderTranscriptSegments() {
  const container = document.getElementById('transcript-segments');
  if (!container || !currentTranscript || !currentTranscript.segments) return;
  
  container.innerHTML = '';
  
  currentTranscript.segments.forEach(seg => {
    const card = document.createElement('div');
    card.className = "p-2.5 rounded-lg hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800 flex items-start space-x-3 transition-all";
    
    const timeFormatted = formatSeconds(seg.offset);
    card.innerHTML = `
      <span class="time-tag px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide flex-shrink-0 select-none" onclick="seekTo(${seg.offset})">
        ${timeFormatted}
      </span>
      <p class="text-xs text-zinc-300 leading-relaxed">${seg.text}</p>
    `;
    container.appendChild(card);
  });
}

// Filter transcript segments based on search
function filterTranscript() {
  const query = document.getElementById('transcript-search').value.toLowerCase().trim();
  const container = document.getElementById('transcript-segments');
  const empty = document.getElementById('transcript-empty');
  
  if (!currentTranscript || !currentTranscript.segments) return;
  
  let matchCount = 0;
  const cards = container.children;
  
  currentTranscript.segments.forEach((seg, idx) => {
    const card = cards[idx];
    if (card) {
      if (seg.text.toLowerCase().includes(query)) {
        card.classList.remove('hidden');
        matchCount++;
      } else {
        card.classList.add('hidden');
      }
    }
  });
  
  if (matchCount === 0) {
    empty.innerText = `No segments match "${query}"`;
    empty.classList.remove('hidden');
    container.classList.add('hidden');
  } else {
    empty.classList.add('hidden');
    container.classList.remove('hidden');
  }
}

// Seek YouTube video player to specific time
function seekTo(seconds) {
  if (!selectedVideo) return;
  const iframe = document.getElementById('video-iframe');
  iframe.src = `https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&start=${seconds}&enablejsapi=1`;
}

// Format seconds to string MM:SS or HH:MM:SS
function formatSeconds(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Trigger AI Summarization
async function triggerSummary() {
  if (!selectedVideo) return;
  
  if (!geminiKey) {
    alert('API Key missing. Please go to the Settings tab and add your Gemini API Key first.');
    switchTab('settings');
    return;
  }
  
  const summaryEmpty = document.getElementById('summary-empty');
  const summaryLoading = document.getElementById('summary-loading');
  const summaryContent = document.getElementById('summary-content');
  const progressText = document.getElementById('summary-progress-text');
  
  summaryEmpty.classList.add('hidden');
  summaryLoading.classList.remove('hidden');
  summaryContent.classList.add('hidden');
  
  progressText.innerText = "Checking transcript status...";
  
  // Fetch transcript if we don't have it loaded
  if (!currentTranscript) {
    try {
      progressText.innerText = "Downloading transcript from YouTube...";
      const response = await fetch(`/api/transcript?videoId=${selectedVideo.id}`);
      if (!response.ok) throw new Error('Transcript download failed');
      currentTranscript = await response.json();
    } catch (err) {
      summaryLoading.classList.add('hidden');
      summaryEmpty.classList.remove('hidden');
      alert('Subtitles / transcripts are unavailable for this video. Cannot generate AI Summary.');
      return;
    }
  }
  
  progressText.innerText = `Analyzing transcript with Gemini (${geminiModel})...`;
  
  try {
    const prompt = `You are a expert YouTube Research Agent. Below is the transcript for the video titled "${selectedVideo.title || 'Unknown Video'}" by "${selectedVideo.channel || 'Unknown Channel'}".
    Provide a comprehensive, premium markdown summary of this video. Organize it cleanly with:
    - # ${selectedVideo.title} (Summary)
    - A high-level overview (1-2 paragraphs summarizing the core message and target audience)
    - ## Key Takeaways & Highlights (3-5 structured bullet points explaining key ideas or demonstrations)
    - ## Core Concepts discussed (List any frameworks, definitions, or methods explained)
    - ## Timeline & Topics (Estimate major chapter benchmarks based on the transcript progression, and format timestamps in brackets like [MM:SS])
    - ## Software Tools & Resources (List any specific websites, platforms, libraries, books, or tools mentioned)
    
    If the transcript text is disorganized, please clean up punctuation and structure.
    
    Transcript:
    ${currentTranscript.fullText || currentTranscript.segments.map(s => s.text).join(' ')}`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const errorMsg = data.error ? data.error.message : 'Error calling Gemini API';
      throw new Error(errorMsg);
    }
    
    const summaryText = data.candidates[0].content.parts[0].text;
    
    summaryLoading.classList.add('hidden');
    summaryContent.classList.remove('hidden');
    
    // Render Markdown using marked.js
    summaryContent.innerHTML = marked.parse(summaryText);
    
    // Add event listeners to any generated timestamp links [MM:SS]
    setupTimestampClickHandlers(summaryContent);
    
  } catch (error) {
    summaryLoading.classList.add('hidden');
    summaryEmpty.classList.remove('hidden');
    alert('Summary Generation Failed: ' + error.message);
  }
}

// Automatically bind click handlers to bracketed timestamps like [MM:SS] or [MM:SS-MM:SS] in summary text
function setupTimestampClickHandlers(container) {
  let content = container.innerHTML;
  
  // Pre-process: split comma-separated items inside a single bracket pair (e.g. [00:54-00:55, 01:04-01:05] -> [00:54-00:55], [01:04-01:05])
  content = content.replace(/\[([^\]]+)\]/g, (match, innerText) => {
    if (innerText.includes(',')) {
      return innerText.split(',')
        .map(t => `[${t.trim()}]`)
        .join(', ');
    }
    return match;
  });
  
  // 1. Replace range patterns like [00:03-00:10] or [00:03 - 00:10]
  content = content.replace(/\[((\d{1,2}:)?\d{1,2}:\d{2})\s*[-–—]\s*((\d{1,2}:)?\d{1,2}:\d{2})\]/g, (match, startStr, p2, endStr) => {
    const startSec = parseTimeToSeconds(startStr);
    return `<span class="time-tag px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide cursor-pointer" onclick="seekTo(${startSec})">${match}</span>
            <button onclick="addClipToClipper('${startStr}', '${endStr}')" class="ml-1 inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide bg-red-950/40 text-red-400 hover:bg-red-950/60 border border-red-500/20 hover:border-red-500/40 transition-all active:scale-95" title="Add to Clipper">
              <i data-lucide="scissors" class="w-2.5 h-2.5 inline"></i>
              <span>Clip</span>
            </button>`;
  });
  
  // 2. Replace single patterns like [15:23] or [01:05:30] with interactive spans + Clip button (defaults to 10 seconds duration)
  content = content.replace(/\[((\d{1,2}:)?\d{1,2}:\d{2})\]/g, (match, timeStr) => {
    const seconds = parseTimeToSeconds(timeStr);
    const endSeconds = seconds + 10;
    const endStr = formatSeconds(endSeconds);
    return `<span class="time-tag px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide cursor-pointer" onclick="seekTo(${seconds})">${match}</span>
            <button onclick="addClipToClipper('${timeStr}', '${endStr}')" class="ml-1 inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide bg-red-950/40 text-red-400 hover:bg-red-950/60 border border-red-500/20 hover:border-red-500/40 transition-all active:scale-95" title="Add to Clipper (10s duration)">
              <i data-lucide="scissors" class="w-2.5 h-2.5 inline"></i>
              <span>Clip</span>
            </button>`;
  });
  
  container.innerHTML = content;
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Add a parsed segment range directly to the Clipper interface
function addClipToClipper(start, end) {
  switchRightTab('clipper');
  
  const container = document.getElementById('clip-definitions-container');
  const index = container.children.length + 1;
  
  let row;
  const firstRow = container.querySelector('.clip-row');
  if (firstRow && container.children.length === 1) {
    const startVal = firstRow.querySelector('.clip-start').value;
    const endVal = firstRow.querySelector('.clip-end').value;
    if (startVal === '0:00' && endVal === '0:10') {
      row = firstRow;
    }
  }
  
  if (!row) {
    addClipRow();
    row = container.lastElementChild;
  }
  
  row.querySelector('.clip-start').value = start;
  row.querySelector('.clip-end').value = end;
  row.querySelector('.clip-label').value = `segment${index}`;
  
  document.getElementById('right-tab-clipper').scrollIntoView({ behavior: 'smooth' });
}

// Convert MM:SS or HH:MM:SS strings to numeric seconds
function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  } else if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  return 0;
}

// Handle Chat Message Submission
async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message || !selectedVideo) return;
  
  if (!geminiKey) {
    alert('Gemini key missing. Please go to the Settings tab and add your key.');
    switchTab('settings');
    return;
  }
  
  // Append user message
  appendChatMessage('user', message);
  input.value = '';
  input.focus();
  
  const messagesDiv = document.getElementById('chat-messages');
  
  // Append temporary loading bubble
  const loadingBubble = document.createElement('div');
  loadingBubble.className = "flex space-x-3 items-start max-w-[85%] animate-pulse";
  loadingBubble.innerHTML = `
    <div class="w-7 h-7 rounded-lg bg-violet-900/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
      <i data-lucide="bot" class="w-4 h-4 text-violet-400"></i>
    </div>
    <div class="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl px-4 py-2.5 text-xs text-zinc-500">
      AI is scanning transcript...
    </div>
  `;
  messagesDiv.appendChild(loadingBubble);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  lucide.createIcons();
  
  // Fetch transcript if missing
  if (!currentTranscript) {
    try {
      const response = await fetch(`/api/transcript?videoId=${selectedVideo.id}`);
      if (!response.ok) throw new Error('Transcript not available');
      currentTranscript = await response.json();
    } catch (err) {
      loadingBubble.remove();
      appendChatMessage('bot', "Sorry, I couldn't download a transcript for this video, so I cannot answer questions about it.");
      return;
    }
  }
  
  // Call Gemini API
  try {
    chatHistory.push({ role: 'user', content: message });
    
    // Map history to string context
    const historyText = chatHistory.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
    
    const prompt = `You are a helpful AI assistant. You are analyzing the YouTube video "${selectedVideo.title}" by "${selectedVideo.channel}".
    
    Below is the complete transcript of the video:
    ---
    ${currentTranscript.fullText || currentTranscript.segments.map(s => s.text).join(' ')}
    ---
    
    Use the transcript text to answer the user's question. Answer concisely and accurately based ONLY on details mentioned in the transcript.
    If the answer is not mentioned in the transcript, say "I cannot find this information in the video transcript."
    Provide timestamps (e.g. [03:45]) if they are clear from the transcript context.
    
    Chat Session:
    ${historyText}
    Assistant:`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    loadingBubble.remove();
    
    if (!response.ok) {
      const errorMsg = data.error ? data.error.message : 'Error talking to Gemini API';
      throw new Error(errorMsg);
    }
    
    const reply = data.candidates[0].content.parts[0].text.trim();
    chatHistory.push({ role: 'assistant', content: reply });
    
    appendChatMessage('bot', reply);
    
    // Restore focus
    if (input) input.focus();
    
  } catch (error) {
    loadingBubble.remove();
    appendChatMessage('bot', `Error communicating with AI model: ${error.message}`);
    if (input) input.focus();
  }
}

// Append messages to the chat logs
function appendChatMessage(sender, text) {
  const container = document.getElementById('chat-messages');
  const wrapper = document.createElement('div');
  
  if (sender === 'user') {
    wrapper.className = "flex space-x-3 items-start justify-end max-w-[90%] ml-auto";
    wrapper.innerHTML = `
      <div class="chat-msg-user rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-zinc-200">
        ${text}
      </div>
    `;
  } else {
    wrapper.className = "flex space-x-3 items-start max-w-[90%]";
    wrapper.innerHTML = `
      <div class="w-7 h-7 rounded-lg bg-violet-900/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
        <i data-lucide="bot" class="w-4 h-4 text-violet-400"></i>
      </div>
      <div class="chat-msg-bot rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-zinc-300">
        ${marked.parse(text)}
      </div>
    `;
    
    // Bind timestamp click triggers in assistant answers
    setupTimestampClickHandlers(wrapper.querySelector('.chat-msg-bot'));
  }
  
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  lucide.createIcons();
}

// Clear the Q&A chat log
function clearChat() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div class="flex space-x-3 items-start max-w-[85%]">
      <div class="w-7 h-7 rounded-lg bg-violet-900/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
        <i data-lucide="bot" class="w-4 h-4 text-violet-400"></i>
      </div>
      <div class="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-zinc-300">
        Hello! Ask me anything about the contents of this video. I will analyze the full transcript to find the exact details for you.
      </div>
    </div>
  `;
  chatHistory = [];
}

// Add a new row to the custom clips form
function addClipRow() {
  const container = document.getElementById('clip-definitions-container');
  const index = container.children.length + 1;
  
  const row = document.createElement('div');
  row.className = "clip-row p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 grid grid-cols-1 md:grid-cols-3 gap-3 items-end relative";
  row.innerHTML = `
    <div class="space-y-1">
      <label class="text-[10px] font-semibold text-zinc-400">Start Time (e.g. 1:30 or 90)</label>
      <input type="text" class="clip-start w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-zinc-200" placeholder="0:00" value="0:00">
    </div>
    <div class="space-y-1">
      <label class="text-[10px] font-semibold text-zinc-400">End Time (e.g. 2:15 or 135)</label>
      <input type="text" class="clip-end w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-zinc-200" placeholder="0:10" value="0:10">
    </div>
    <div class="space-y-1 flex justify-between items-end gap-2">
      <div class="flex-1 space-y-1">
        <label class="text-[10px] font-semibold text-zinc-400">Label</label>
        <input type="text" class="clip-label w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-zinc-200" placeholder="clip${index}" value="clip${index}">
      </div>
      <button onclick="this.closest('.clip-row').remove()" class="text-red-500 hover:text-red-400 p-2 rounded-lg bg-red-950/20 border border-red-500/20 hover:bg-red-950/30 transition-all">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `;
  container.appendChild(row);
  lucide.createIcons();
}

// Download full video using API
async function downloadFullVideo() {
  if (!selectedVideo) return;
  
  const statusDiv = document.getElementById('download-full-status');
  const btn = document.getElementById('btn-download-full');
  const quality = document.getElementById('download-quality').value;
  const format = document.getElementById('download-format').value;
  
  const type = format === 'mp3' ? 'audio' : 'video+audio';
  const containerFormat = format === 'mp3' ? 'mp3' : 'mp4';
  
  statusDiv.className = "text-xs py-2 px-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 animate-pulse";
  statusDiv.innerHTML = "Downloading and processing video on Render. This may take 1-2 minutes for larger files...";
  statusDiv.classList.remove('hidden');
  btn.disabled = true;
  
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoId: selectedVideo.id,
        quality,
        type,
        format: containerFormat,
        force: true
      })
    });
    
    btn.disabled = false;
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to download video');
    }
    
    if (data.warning) {
      statusDiv.className = "text-xs py-2.5 px-3.5 rounded-xl border border-yellow-500/20 bg-yellow-950/20 text-yellow-400";
      statusDiv.innerText = data.warning;
    } else {
      statusDiv.className = "text-xs py-2.5 px-3.5 rounded-xl border border-green-500/20 bg-green-950/20 text-green-400 flex items-center justify-between flex-wrap gap-2";
      statusDiv.innerHTML = `
        <div class="space-y-0.5">
          <p class="font-semibold">Download Complete!</p>
          <p class="text-[10px] text-zinc-400">${data.title} (${data.fileSize})</p>
        </div>
        <a href="${data.downloadUrl}" download class="bg-green-600 hover:bg-green-500 text-white font-semibold text-[10px] px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all">
          <i data-lucide="download" class="w-3 h-3"></i>
          <span>Save File</span>
        </a>
      `;
      lucide.createIcons();
    }
  } catch (err) {
    btn.disabled = false;
    statusDiv.className = "text-xs py-2.5 px-3.5 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400";
    statusDiv.innerText = "Error: " + err.message;
  }
}

// Generate clips using API
async function triggerClipping() {
  if (!selectedVideo) return;
  
  const statusDiv = document.getElementById('clipper-status');
  const btn = document.getElementById('btn-clip-generate');
  
  // Gather clips
  const clipRows = document.querySelectorAll('.clip-row');
  const clips = [];
  
  clipRows.forEach(row => {
    const startTime = row.querySelector('.clip-start').value.trim();
    const endTime = row.querySelector('.clip-end').value.trim();
    const label = row.querySelector('.clip-label').value.trim();
    
    if (startTime && endTime) {
      clips.push({ startTime, endTime, label });
    }
  });
  
  if (clips.length === 0) {
    alert('Please define at least one clip segment.');
    return;
  }
  
  statusDiv.className = "text-xs py-2 px-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 animate-pulse";
  statusDiv.innerHTML = "Downloading video, cutting segments, and generating highlight reel. This may take 1-2 minutes...";
  statusDiv.classList.remove('hidden');
  btn.disabled = true;
  
  const aspectRatio = document.getElementById('clip-aspect-ratio').value;
  const highlightReel = document.getElementById('clip-combine-reel').checked;

  try {
    const response = await fetch('/api/clip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoId: selectedVideo.id,
        clips,
        highlightReel,
        aspectRatio,
        force: true
      })
    });
    
    btn.disabled = false;
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to extract clips');
    }
    
    statusDiv.className = "text-xs py-3 px-3.5 rounded-xl border border-green-500/20 bg-green-950/20 text-green-400 space-y-3";
    
    let htmlContent = `<p class="font-semibold">Clipping Complete!</p>`;
    
    if (data.highlightReel) {
      htmlContent += `
        <div class="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div class="space-y-0.5">
            <span class="px-2 py-0.5 rounded text-[8px] bg-red-600/20 text-red-400 border border-red-500/20 font-bold uppercase tracking-wider">Highlight Reel</span>
            <p class="text-[10px] text-zinc-300 font-medium">${selectedVideo.title || 'Video'} - Highlight Reel</p>
          </div>
          <a href="${data.highlightReel.downloadUrl}" download class="bg-red-600 hover:bg-green-500 text-white font-semibold text-[9px] px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-all">
            <i data-lucide="download" class="w-2.5 h-2.5"></i>
            <span>Download Reel (${data.highlightReel.fileSize})</span>
          </a>
        </div>
      `;
    }
    
    const clipsArray = data.clips || (Array.isArray(data) ? data : []);
    if (clipsArray.length > 0) {
      htmlContent += `<div class="space-y-1.5 pt-1">
        <p class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Individual Clips</p>`;
      
      clipsArray.forEach(clip => {
        htmlContent += `
          <div class="p-2 rounded-lg bg-zinc-950/30 border border-zinc-800/50 flex items-center justify-between text-[10px]">
            <span class="text-zinc-300 font-medium">${clip.label} (${clip.clipDuration})</span>
            <a href="${clip.downloadUrl}" download class="text-red-400 hover:text-red-300 font-semibold flex items-center space-x-0.5">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Download</span>
            </a>
          </div>
        `;
      });
      
      htmlContent += `</div>`;
    }
    
    statusDiv.innerHTML = htmlContent;
    lucide.createIcons();
    
  } catch (err) {
    btn.disabled = false;
    statusDiv.className = "text-xs py-2.5 px-3.5 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400";
    statusDiv.innerText = "Error: " + err.message;
  }
}

// --- YouTube Authentication Cookies Management ---

async function checkCookiesStatus() {
  const badge = document.getElementById('cookies-status-badge');
  const clearBtn = document.getElementById('clear-cookies-btn');
  if (!badge) return;

  try {
    const response = await fetch('/api/cookies/status');
    const data = await response.json();
    
    if (data.configured) {
      badge.className = "flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20";
      badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span><span>Configured</span>`;
      if (clearBtn) clearBtn.disabled = false;
    } else {
      badge.className = "flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400";
      badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-zinc-600"></span><span>Not Configured</span>`;
      if (clearBtn) clearBtn.disabled = true;
    }
  } catch (err) {
    console.error('Failed to fetch cookies status:', err);
    badge.className = "flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20";
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span><span>Error</span>`;
  }
}

async function saveCookiesToServer() {
  const input = document.getElementById('cookies-input');
  if (!input) return;
  const cookieString = input.value.trim();
  
  if (!cookieString) {
    alert('Please paste a valid cookies string or Netscape cookie file content.');
    return;
  }
  
  try {
    const response = await fetch('/api/cookies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cookieString })
    });
    
    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(`Server returned status ${response.status} (non-JSON response). The server may still be deploying/restarting. Please wait a minute and try again.`);
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save cookies');
    }
    
    alert('Cookies saved and configured successfully on the server!');
    input.value = '';
    await checkCookiesStatus();
  } catch (err) {
    alert('Error saving cookies: ' + err.message);
  }
}

async function clearCookies() {
  if (!confirm('Are you sure you want to clear the cookies on the server? This will delete the session cookies file.')) {
    return;
  }
  
  try {
    const response = await fetch('/api/cookies', {
      method: 'DELETE'
    });
    
    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(`Server returned status ${response.status} (non-JSON response). The server may still be deploying/restarting. Please wait a minute and try again.`);
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to clear cookies');
    }
    
    alert('Cookies cleared successfully!');
    await checkCookiesStatus();
  } catch (err) {
    alert('Error clearing cookies: ' + err.message);
  }
}
