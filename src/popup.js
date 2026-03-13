// Popup script for Keystroke Display extension
const toggleSwitch = document.getElementById('toggleSwitch');
const statusElement = document.getElementById('status');

let isEnabled = false;

// Update UI based on current state
function updateUI(enabled) {
  isEnabled = enabled;

  if (enabled) {
    toggleSwitch.classList.add('active');
    statusElement.textContent = 'Enabled';
    statusElement.classList.remove('disabled');
    statusElement.classList.add('enabled');
  } else {
    toggleSwitch.classList.remove('active');
    statusElement.textContent = 'Disabled';
    statusElement.classList.remove('enabled');
    statusElement.classList.add('disabled');
  }

  // Save state
  chrome.storage.local.set({ keystrokeEnabled: enabled });
}

// Toggle the extension
function toggleExtension() {
  const newState = !isEnabled;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    const tab = tabs[0];

    // Check if we can inject scripts on this page
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
      alert('Cannot run on browser internal pages. Please try on a regular website.');
      return;
    }

    // Update UI immediately
    updateUI(newState);

    // Try to send message to existing content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'toggle',
      enabled: newState
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded, inject it
        console.log('Injecting content script...');

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          return chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['styles.css']
          });
        }).then(() => {
          console.log('Content script injected, sending toggle message...');
          // Wait a moment for script to initialize
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'toggle',
              enabled: newState
            }, () => {
              if (chrome.runtime.lastError) {
                console.error('Still failed:', chrome.runtime.lastError);
              } else {
                console.log('Success!');
              }
            });
          }, 200);
        }).catch((error) => {
          console.error('Injection failed:', error);
          alert('Failed to activate extension. Please refresh the page and try again.');
        });
      } else {
        console.log('Content script already loaded, toggled successfully');
      }
    });
  });
}

// Initialize - get current state
chrome.storage.local.get(['keystrokeEnabled'], (result) => {
  updateUI(result.keystrokeEnabled || false);
});

// Add click listener to toggle switch
toggleSwitch.addEventListener('click', toggleExtension);

