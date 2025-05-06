(function startBubbles() {
  const createBubble = () => {
    const bubble = document.createElement("div");
    bubble.classList.add("bubble");

    const size = Math.random() * 40 + 10; // 10px to 50px
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;

    bubble.style.left = `${Math.random() * 100}%`;

    const duration = Math.random() * 5 + 5; // 5s to 10s
    bubble.style.animationDuration = `${duration}s`;

    document.body.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, duration * 1000);
  };

  // Generate bubbles at random intervals
  setInterval(createBubble, 200);
})();
