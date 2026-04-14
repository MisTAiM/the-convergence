<svg width="100%" height="180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="nebula" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1f"/>
      <stop offset="50%" stop-color="#1b2a4a"/>
      <stop offset="100%" stop-color="#4a6fa3"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#nebula)"/>

  <text x="50%" y="50%" font-size="48" fill="#c9d6ff" text-anchor="middle" filter="url(#glow)"
        font-family="Consolas, monospace" letter-spacing="4">
    THE CONVERGENCE
  </text>

  <text x="50%" y="75%" font-size="16" fill="#9bb3d9" text-anchor="middle"
        font-family="Consolas, monospace" letter-spacing="2">
    Ancient Texts • World Data • Predictive Synthesis
  </text>
</svg>
