// API endpoints (using ipapi.co as primary, with fallback options)
const API_ENDPOINTS = [
  'https://ipapi.co/json/',
  'https://ifconfig.co/json'
];

const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchIPInfo() {
  const loadingDiv = document.getElementById('loading');
  const contentDiv = document.getElementById('content');
  const errorContainer = document.getElementById('error-container');

  // Show loading, hide others
  loadingDiv.style.display = 'flex';
  contentDiv.style.display = 'none';
  errorContainer.style.display = 'none';

  let lastError = null;

  // Try each endpoint
  for (const endpoint of API_ENDPOINTS) {
    try {
      const data = await fetchWithTimeout(endpoint);
      displayIPInfo(data);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Failed to fetch from ${endpoint}:`, error);
    }
  }

  // If all endpoints fail
  showError(lastError?.message || 'Failed to fetch IP information');
}

function displayIPInfo(data) {
  const loadingDiv = document.getElementById('loading');
  const contentDiv = document.getElementById('content');
  const errorContainer = document.getElementById('error-container');

  // Map API response fields
  const fields = {
    ip: data.ip || data.IPv4 || '-',
    country: data.country_name || data.country || '-',
    region: data.region || data.region_name || '-',
    city: data.city || '-',
    postal_code: data.postal || data.postal_code || '-',
    timezone: data.timezone || '-',
    org: data.org || data.organization || '-',
    latitude: data.latitude || data.lat || '-',
    longitude: data.longitude || data.lon || '-'
  };

  // Update DOM elements
  Object.keys(fields).forEach(key => {
    const element = document.getElementById(key);
    if (element) {
      element.textContent = fields[key];
    }
  });

  loadingDiv.style.display = 'none';
  contentDiv.style.display = 'block';
  errorContainer.style.display = 'none';
}

function showError(message) {
  const loadingDiv = document.getElementById('loading');
  const contentDiv = document.getElementById('content');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');

  errorMessage.textContent = message;
  loadingDiv.style.display = 'none';
  contentDiv.style.display = 'none';
  errorContainer.style.display = 'block';
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show feedback
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = 'Copied!';
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Event listeners
document.getElementById('refreshBtn').addEventListener('click', fetchIPInfo);
document.getElementById('retryBtn').addEventListener('click', fetchIPInfo);

// Copy button listeners
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const field = this.dataset.field;
    const element = document.getElementById(field);
    if (element && element.textContent !== '-') {
      copyToClipboard(element.textContent);
    }
  });
});

// Fetch IP info when popup opens
fetchIPInfo();