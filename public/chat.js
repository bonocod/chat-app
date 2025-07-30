const socket = io();

let username = localStorage.getItem('chat-username') || '';
let currentPrivateRecipient = null;
let unreadPrivateCount = 0;

const usernameContainer = document.getElementById('username-container');
const chatContainer     = document.getElementById('chat-container');
const usernameForm      = document.getElementById('username-form');
const usernameInput     = document.getElementById('username-input');
const chatBoxPublic     = document.getElementById('chat-box-public');
const chatBoxPrivate    = document.getElementById('chat-box-private');
const chatForm          = document.getElementById('chat-form');
const messageInput      = document.getElementById('message-input');
const logoutBtn         = document.getElementById('logout-btn');
const publicTab         = document.getElementById('public-tab');
const privateTab        = document.getElementById('private-tab');

// Auto‑join if saved
if (username) joinChat(username);

usernameForm.addEventListener('submit', e => {
  e.preventDefault();
  username = usernameInput.value.trim();
  if (username) {
    localStorage.setItem('chat-username', username);
    joinChat(username);
  }
});

function joinChat(name) {
  socket.emit('user joined', name);
  usernameContainer.style.display = 'none';
  chatContainer.style.display   = 'flex';
  // Reset tabs and recipient
  currentPrivateRecipient = null;
  updatePrivateTabLabel();
  publicTab.click();            // default to public tab
}

// Update Private tab label
function updatePrivateTabLabel() {
  privateTab.textContent = unreadPrivateCount > 0
    ? `Private (${unreadPrivateCount})`
    : 'Private';
}

// Handle form submit for public vs private
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;

  if (privateTab.classList.contains('active-tab') && currentPrivateRecipient) {
    // PRIVATE
    socket.emit('private message', {
      toUsername: currentPrivateRecipient,
      from: username,
      message: msg,
    });
    // locally append
    appendPrivateMessage({
      from: username,
      message: msg,
      timestamp: new Date(),
      self: true,
      to: currentPrivateRecipient
    });
  } else {
    // PUBLIC
    socket.emit('chat message', msg);
  }

  messageInput.value = '';
});

// Append public message
function appendPublicMessage(msg) {
  if (typeof msg === 'string') {
    msg = { from: 'System', content: msg, timestamp: new Date() };
  }
  const li = document.createElement('li');
  li.className = 'chat-message';
  const time = new Date(msg.timestamp);
  const timeStr = isNaN(time) ? '⏰ Unknown Time' : time.toLocaleTimeString();
  const fromDisplay = msg.from === username ? 'You' : (msg.from || 'System');
  li.textContent = `[${timeStr}] ${fromDisplay}: ${msg.content}`;
  if (msg.content.startsWith('🔔') || msg.content.startsWith('❌') || msg.content.startsWith('✍️')) {
    li.classList.add('system-message');
  }
  chatBoxPublic.appendChild(li);
  chatBoxPublic.scrollTop = chatBoxPublic.scrollHeight;
}

// Append private message
function appendPrivateMessage({ from, message, timestamp, self = false, to }) {
  const li = document.createElement('li');
  li.className = 'private-message';
  const time = new Date(timestamp);
  const timeStr = isNaN(time) ? '⏰ Unknown Time' : time.toLocaleTimeString();
  const fromDisplay = self ? 'You' : from;
  const label = self ? `(Private to ${to})` : '(Private)';
  li.textContent = `[${timeStr}] ${label} ${fromDisplay}: ${message}`;
  chatBoxPrivate.appendChild(li);
  chatBoxPrivate.scrollTop = chatBoxPrivate.scrollHeight;

  // If user not viewing private tab, notify
  if (!privateTab.classList.contains('active-tab') && !self) {
    unreadPrivateCount++;
    updatePrivateTabLabel();
  }
}

// Socket handlers
socket.on('chat message', appendPublicMessage);

socket.on('typing', name => {
  if (!document.getElementById('typing-msg')) {
    const typingDiv = document.createElement('li');
    typingDiv.id = 'typing-msg';
    typingDiv.className = 'system-message';
    typingDiv.textContent = `✍️ ${name} is typing...`;
    chatBoxPublic.appendChild(typingDiv);
    chatBoxPublic.scrollTop = chatBoxPublic.scrollHeight;
    setTimeout(() => typingDiv.remove(), 3000);
  }
});
messageInput.addEventListener('input', () => {
  socket.emit('typing', username);
});

socket.on('user list', usernames => {
  const list = document.getElementById('user-list');
  list.innerHTML = '';
  usernames.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    if (name !== username) {
      const btn = document.createElement('button');
      btn.textContent = 'Chat';
      btn.classList.add('chat-btn');
      btn.onclick = () => {
        currentPrivateRecipient = name;
        privateTab.click();
        showClosePrivate();
        messageInput.focus();
      };
      li.appendChild(btn);
    }
    list.appendChild(li);
  });
});

socket.on('private message', data => {
  appendPrivateMessage({ ...data, self: false });
});

// Tab switching
publicTab.onclick = () => {
  chatBoxPublic.style.display  = 'block';
  chatBoxPrivate.style.display = 'none';
  publicTab.classList.add('active-tab');
  privateTab.classList.remove('active-tab');
  currentPrivateRecipient = null;
  unreadPrivateCount = 0;
  updatePrivateTabLabel();
};
privateTab.onclick = () => {
  chatBoxPublic.style.display  = 'none';
  chatBoxPrivate.style.display = 'block';
  privateTab.classList.add('active-tab');
  publicTab.classList.remove('active-tab');
  showClosePrivate();
  unreadPrivateCount = 0;
  updatePrivateTabLabel();
};

// Close private chat button
function showClosePrivate() {
  if (!document.getElementById('close-private-btn')) {
    const btn = document.createElement('button');
    btn.id = 'close-private-btn';
    btn.textContent = 'Close Private Chat';
    btn.className = 'chat-btn';
    btn.style.marginBottom = '10px';
    btn.onclick = () => {
      publicTab.click();
    };
    const chatArea = document.getElementById('chat-area');
    chatArea.insertBefore(btn, chatArea.firstChild);
  }
}

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('chat-username');
  socket.disconnect();
  location.reload();
});
