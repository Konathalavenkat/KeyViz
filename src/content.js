// Keystroke Display Content Script
let isEnabled = false;
let displayContainer = null;
let currentWord = ''; // Accumulate regular keys into words
let wordTimeout = null; // Timeout to clear current word
let currentDisplayElement = null; // DOM element for current keystroke/word

// Create the display container
function createDisplayContainer() {
  if (displayContainer) return;

  displayContainer = document.createElement('div');
  displayContainer.id = 'keystroke-display-container';
  document.body.appendChild(displayContainer);
}

// Remove the display container
function removeDisplayContainer() {
  if (displayContainer) {
    displayContainer.remove();
    displayContainer = null;
    currentDisplayElement = null;
  }
}

// Format key for display
function formatKey(event) {
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey && event.key !== 'Shift') modifiers.push('Shift');
  if (event.metaKey && event.key !== 'Meta') modifiers.push('Cmd');

  let key = event.key;

  // Special key names
  const specialKeys = {
    ' ': 'Space',
    'Enter': '↵ Enter',
    'Backspace': '⌫ Backspace',
    'Delete': '⌦ Delete',
    'Tab': '⇥ Tab',
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'CapsLock': 'Caps Lock',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'Page Up',
    'PageDown': 'Page Down',
    'Meta': 'Cmd',
    'Control': 'Ctrl',
    'Alt': 'Alt',
    'Shift': 'Shift'
  };

  if (specialKeys[key]) {
    key = specialKeys[key];
  }

  if (modifiers.length > 0 && key !== 'Cmd' && key !== 'Ctrl' && key !== 'Alt' && key !== 'Shift') {
    return `${modifiers.join(' + ')} + ${key}`;
  }

  return key;
}

// Check if key is a modifier/special key (not a regular character)
function isModifier(event) {
  return event.ctrlKey || event.altKey || event.metaKey ||
         ['Enter', 'Escape', 'Tab', 'Backspace', 'Delete', ' '].includes(event.key) ||
         event.key.startsWith('Arrow') ||
         event.key.startsWith('F');
}

// Clear current display
function clearDisplay() {
  currentWord = '';
  if (currentDisplayElement) {
    currentDisplayElement.remove();
    currentDisplayElement = null;
  }
}

// Display keystroke
function displayKeystroke(event) {
  if (!isEnabled || !displayContainer) return;

  const keyText = formatKey(event);

  if (isModifier(event)) {
    // Modifier/special key: clear current word first, then show this key
    clearDisplay();

    // Show hotkey
    currentDisplayElement = document.createElement('div');
    currentDisplayElement.className = 'keystroke-display-item';
    currentDisplayElement.textContent = keyText;
    displayContainer.appendChild(currentDisplayElement);

    // Auto-remove after a short time
    clearTimeout(wordTimeout);
    wordTimeout = setTimeout(() => {
      clearDisplay();
    }, 1000);
  } else {
    // Regular key: accumulate into current word
    if (event.key.length === 1) { // Only single characters
      currentWord += event.key;

      // Create or update current word element
      if (!currentDisplayElement) {
        currentDisplayElement = document.createElement('div');
        currentDisplayElement.className = 'keystroke-display-item';
        displayContainer.appendChild(currentDisplayElement);
      }

      currentDisplayElement.textContent = currentWord;

      // Reset word timeout - clear after 1 second of no typing
      clearTimeout(wordTimeout);
      wordTimeout = setTimeout(() => {
        clearDisplay();
      }, 1000);
    }
  }
}

// Keyboard event listener
function handleKeyDown(event) {
  displayKeystroke(event);
}

// Toggle keystroke display
function toggleKeystrokeDisplay(enabled) {
  isEnabled = enabled;

  if (enabled) {
    createDisplayContainer();
    document.addEventListener('keydown', handleKeyDown, true);
  } else {
    removeDisplayContainer();
    document.removeEventListener('keydown', handleKeyDown, true);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'toggle') {
    toggleKeystrokeDisplay(message.enabled);
    sendResponse({ success: true });
  } else if (message.action === 'getStatus') {
    sendResponse({ enabled: isEnabled });
  } else if (message.action === 'ping') {
    sendResponse({ pong: true });
  }
  return true;
});

// Initialize - check if should be enabled by default
chrome.storage.local.get(['keystrokeEnabled'], (result) => {
  if (result.keystrokeEnabled) {
    toggleKeystrokeDisplay(true);
  }
});

