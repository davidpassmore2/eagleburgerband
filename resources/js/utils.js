(function createSoftBubbles() {
  const overlayHost = document.createElement('div');
  Object.assign(overlayHost.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '2147483647'
  });

  const shadow = overlayHost.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(overlayHost);

  const style = document.createElement('style');
  style.textContent = `
    .bubble {
      position: absolute;
      bottom: -60px;
      border-radius: 50%;
      background: transparent;
      pointer-events: none;
      animation: floatUp linear forwards;
      box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.4), 0 0 4px rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    @keyframes floatUp {
      to {
        transform: translateY(-120vh);
        opacity: 0;
      }
    }
  `;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.id = 'bubble-container';
  Object.assign(container.style, {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  });
  shadow.appendChild(container);

  function getSubtleTint() {
    const hue = Math.floor(Math.random() * 360);
    return `hsla(${hue}, 30%, 85%, 0.15)`;
  }

  function spawnBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const size = Math.random() * 50 + 20;
    const duration = Math.random() * 5 + 5;

    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.animationDuration = `${duration}s`;

    bubble.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), ${getSubtleTint()})`;

    container.appendChild(bubble);
    setTimeout(() => bubble.remove(), duration * 1000);
  }

  setInterval(spawnBubble, 200);
})();