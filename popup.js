const PROVIDERS = [
  {
    name: 'ipapi.co',
    url: 'https://ipapi.co/json/',
    normalize(data) {
      return {
        ip: data.ip || '-',
        country: data.country_name || '-',
        region: data.region || '-',
        city: data.city || '-',
        postal_code: data.postal || '-',
        timezone: data.timezone || '-',
        org: data.org || '-',
        latitude: data.latitude || '-',
        longitude: data.longitude || '-'
      };
    }
  },
  {
    name: 'ipwho.is',
    url: 'https://ipwho.is/',
    normalize(data) {
      if (data.success === false) throw new Error(data.message || 'Lookup failed');
      return {
        ip: data.ip || '-',
        country: data.country || '-',
        region: data.region || '-',
        city: data.city || '-',
        postal_code: data.postal || '-',
        timezone: data.timezone?.id || '-',
        org: data.connection?.org || data.connection?.isp || '-',
        latitude: data.latitude ?? '-',
        longitude: data.longitude ?? '-'
      };
    }
  },
  {
    name: 'freeipapi.com',
    url: 'https://free.freeipapi.com/api/json',
    normalize(data) {
      return {
        ip: data.ipAddress || '-',
        country: data.countryName || '-',
        region: data.regionName || '-',
        city: data.cityName || '-',
        postal_code: data.zipCode || '-',
        timezone: data.timeZones?.[0] || '-',
        org: data.asnOrganization || '-',
        latitude: data.latitude ?? '-',
        longitude: data.longitude ?? '-'
      };
    }
  },
  {
    name: 'ipinfo.io',
    url: 'https://ipinfo.io/json',
    normalize(data) {
      const [lat, lon] = (data.loc || ',').split(',');
      return {
        ip: data.ip || '-',
        country: data.country || '-',
        region: data.region || '-',
        city: data.city || '-',
        postal_code: data.postal || '-',
        timezone: data.timezone || '-',
        org: data.org || '-',
        latitude: lat || '-',
        longitude: lon || '-'
      };
    }
  },
  {
    name: 'ifconfig.co',
    url: 'https://ifconfig.co/json',
    normalize(data) {
      return {
        ip: data.ip || '-',
        country: data.country || '-',
        region: data.region_name || '-',
        city: data.city || '-',
        postal_code: data.zip_code || '-',
        timezone: data.time_zone || '-',
        org: data.asn_org || '-',
        latitude: data.latitude ?? '-',
        longitude: data.longitude ?? '-'
      };
    }
  },
  {
    name: 'country.is',
    url: 'https://api.country.is/',
    normalize(data) {
      return {
        ip: data.ip || '-',
        country: '-',
        region: '-',
        city: '-',
        postal_code: '-',
        timezone: '-',
        org: '-',
        latitude: '-',
        longitude: '-'
      };
    }
  }
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

  loadingDiv.style.display = 'flex';
  contentDiv.style.display = 'none';
  errorContainer.style.display = 'none';

  let lastError = null;

  for (const provider of PROVIDERS) {
    try {
      const data = await fetchWithTimeout(provider.url);
      const fields = provider.normalize(data);
      if (!fields.ip || fields.ip === '-') {
        throw new Error('Missing IP in response');
      }
      displayIPInfo(fields, provider.name);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`[${provider.name}] failed:`, error);
    }
  }

  showError(lastError?.message || 'Failed to fetch IP information');
}

function displayIPInfo(fields, providerName) {
  const loadingDiv = document.getElementById('loading');
  const contentDiv = document.getElementById('content');
  const errorContainer = document.getElementById('error-container');
  const providerLabel = document.getElementById('provider-name');

  Object.keys(fields).forEach(key => {
    const element = document.getElementById(key);
    if (element) {
      element.textContent = fields[key];
    }
  });

  if (providerLabel) {
    providerLabel.textContent = providerName;
    providerLabel.classList.add('visible');
  }

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

document.getElementById('refreshBtn').addEventListener('click', fetchIPInfo);
document.getElementById('retryBtn').addEventListener('click', fetchIPInfo);

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const field = this.dataset.field;
    const element = document.getElementById(field);
    if (element && element.textContent !== '-') {
      copyToClipboard(element.textContent);
    }
  });
});

fetchIPInfo();
