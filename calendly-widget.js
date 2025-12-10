// ============================================================
// CALENDLY WIDGET - Custom Web Component for Wix
// ============================================================
//
// This widget embeds Calendly with proper dynamic height adjustment
// that the native Wix Calendly integration doesn't handle well.
//
// USAGE:
// 1. Add this script to your Wix site via Custom Code or Velo
// 2. Add the HTML element: <calendly-widget url="https://calendly.com/your-link"></calendly-widget>
//
// ATTRIBUTES:
// - url: Your Calendly scheduling link (required)
// - height: Minimum height in pixels (default: 700)
// - hide-details: Set to "true" to hide event details
// - hide-gdpr: Set to "true" to hide GDPR banner
// - background-color: Hex color for background (without #)
// - text-color: Hex color for text (without #)
// - primary-color: Hex color for primary/accent (without #)
//
// EXAMPLE:
// <calendly-widget
//   url="https://calendly.com/duncan-kimputing/get-started"
//   background-color="000000"
//   text-color="FFFFFF"
//   primary-color="FF8122"
// ></calendly-widget>
// ============================================================

class CalendlyWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.iframeId = `calendly-iframe-${Math.random().toString(36).substr(2, 9)}`;
    this.boundMessageHandler = this.handleMessage.bind(this);
  }

  static get observedAttributes() {
    return ['url', 'height', 'hide-details', 'hide-gdpr', 'background-color', 'text-color', 'primary-color'];
  }

  connectedCallback() {
    this.render();
    window.addEventListener('message', this.boundMessageHandler);
  }

  disconnectedCallback() {
    window.removeEventListener('message', this.boundMessageHandler);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.shadowRoot.innerHTML) {
      this.render();
    }
  }

  get calendlyUrl() {
    const baseUrl = this.getAttribute('url') || '';
    if (!baseUrl) return '';

    const url = new URL(baseUrl);

    // Add customization parameters
    if (this.getAttribute('hide-details') === 'true') {
      url.searchParams.set('hide_event_type_details', '1');
    }
    if (this.getAttribute('hide-gdpr') === 'true') {
      url.searchParams.set('hide_gdpr_banner', '1');
    }
    if (this.getAttribute('background-color')) {
      url.searchParams.set('background_color', this.getAttribute('background-color'));
    }
    if (this.getAttribute('text-color')) {
      url.searchParams.set('text_color', this.getAttribute('text-color'));
    }
    if (this.getAttribute('primary-color')) {
      url.searchParams.set('primary_color', this.getAttribute('primary-color'));
    }

    // Add embed parameter to identify as embedded widget
    url.searchParams.set('embed_domain', window.location.hostname);
    url.searchParams.set('embed_type', 'Inline');

    return url.toString();
  }

  get minHeight() {
    return parseInt(this.getAttribute('height') || '700', 10);
  }

  getStyles() {
    return `
      :host {
        display: block;
        width: 100%;
      }

      .calendly-container {
        width: 100%;
        min-height: ${this.minHeight}px;
        position: relative;
        overflow: hidden;
        border-radius: 12px;
        background: transparent;
        transition: height 0.3s ease;
      }

      .calendly-iframe {
        width: 100%;
        height: 100%;
        min-height: ${this.minHeight}px;
        border: none;
        background: transparent;
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        z-index: 1;
        transition: opacity 0.3s ease;
      }

      .loading-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #f0f0f0;
        border-top-color: #4EC3E0;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .error-message {
        padding: 40px 20px;
        text-align: center;
        color: #666;
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .error-message a {
        color: #4EC3E0;
        text-decoration: none;
      }

      .error-message a:hover {
        text-decoration: underline;
      }

      /* Mobile responsive */
      @media (max-width: 700px) {
        .calendly-container {
          border-radius: 8px;
          min-height: 1800px;
        }

        .calendly-iframe {
          min-height: 1800px;
        }
      }
    `;
  }

  render() {
    const url = this.calendlyUrl;

    if (!url) {
      this.shadowRoot.innerHTML = `
        <style>${this.getStyles()}</style>
        <div class="calendly-container">
          <div class="error-message">
            <p>Calendly URL not configured.</p>
            <p>Add the <code>url</code> attribute to the widget.</p>
          </div>
        </div>
      `;
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="calendly-container" id="container">
        <div class="loading-overlay" id="loading">
          <div class="spinner"></div>
        </div>
        <iframe
          id="${this.iframeId}"
          class="calendly-iframe"
          src="${url}"
          frameborder="0"
          scrolling="no"
          title="Schedule a meeting"
          allow="payment"
        ></iframe>
      </div>
    `;

    // Hide loading overlay when iframe loads
    const iframe = this.shadowRoot.getElementById(this.iframeId);
    const loading = this.shadowRoot.getElementById('loading');

    iframe.addEventListener('load', () => {
      setTimeout(() => {
        loading.classList.add('hidden');
      }, 500);
    });
  }

  handleMessage(event) {
    // Only handle messages from Calendly
    if (!event.origin.includes('calendly.com')) return;

    const data = event.data;
    if (!data || !data.event) return;

    // Handle page height changes
    if (data.event === 'calendly.page_height') {
      this.updateHeight(data.payload?.height);
    }

    // Handle scheduling events (optional - for analytics/tracking)
    if (data.event === 'calendly.event_scheduled') {
      this.dispatchEvent(new CustomEvent('scheduled', {
        detail: data.payload,
        bubbles: true,
        composed: true
      }));
    }

    // Handle date/time selection
    if (data.event === 'calendly.date_and_time_selected') {
      this.dispatchEvent(new CustomEvent('datetime-selected', {
        detail: data.payload,
        bubbles: true,
        composed: true
      }));
    }

    // Handle profile page view
    if (data.event === 'calendly.event_type_viewed') {
      this.dispatchEvent(new CustomEvent('viewed', {
        detail: data.payload,
        bubbles: true,
        composed: true
      }));
    }
  }

  updateHeight(height) {
    if (!height) return;

    const container = this.shadowRoot.getElementById('container');
    const iframe = this.shadowRoot.getElementById(this.iframeId);

    if (container && iframe) {
      const newHeight = Math.max(height, this.minHeight);
      container.style.height = `${newHeight}px`;
      iframe.style.height = `${newHeight}px`;
    }
  }
}

// Register the custom element
customElements.define('calendly-widget', CalendlyWidget);
