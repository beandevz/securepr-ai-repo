// Design tokens extracted from Figma prototype
// SecurePR AI Design System

export const theme = {
  // Background colors
  colors: {
    bg: '#06080f',
    bg1: '#0b0f1c',
    bg2: '#0e1321',
    surface: '#121826',
    surface2: '#192035',
    surface3: '#1e2840',

    // Borders
    border: 'rgba(255,255,255,0.06)',
    border2: 'rgba(255,255,255,0.10)',

    // Primary colors
    blue: '#3b82f6',
    blue2: '#60a5fa',
    blue3: '#93c5fd',
    cyan: '#06b6d4',
    cyan2: '#22d3ee',

    // Severity colors
    red: '#ef4444',
    red2: '#f87171',
    amber: '#f59e0b',
    amber2: '#fbbf24',
    green: '#10b981',
    green2: '#34d399',
    purple: '#8b5cf6',
    purple2: '#a78bfa',

    // Text colors
    text: '#f1f5f9',
    text2: '#94a3b8',
    text3: '#475569',
  },

  // Typography
  fonts: {
    ui: "'Syne', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },

  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Border radius
  radius: {
    sm: '8px',
    md: '10px',
    lg: '16px',
    full: '100px',
  },

  // Shadows
  shadows: {
    sm: '0 8px 32px rgba(0,0,0,0.5)',
    lg: '0 20px 60px rgba(0,0,0,0.6)',
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
  },

  // Severity mappings
  severity: {
    critical: {
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.25)',
      weight: 10,
    },
    high: {
      color: '#fb923c',
      bg: 'rgba(249,115,22,0.12)',
      border: 'rgba(249,115,22,0.25)',
      weight: 5,
    },
    medium: {
      color: '#fbbf24',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.25)',
      weight: 2,
    },
    low: {
      color: '#34d399',
      bg: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.25)',
      weight: 1,
    },
  },

  // Status colors
  status: {
    pass: {
      color: '#34d399',
      bg: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.25)',
    },
    fail: {
      color: '#f87171',
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.25)',
    },
    running: {
      color: '#60a5fa',
      bg: 'rgba(59,130,246,0.12)',
      border: 'rgba(59,130,246,0.25)',
    },
    pending: {
      color: '#475569',
      bg: 'rgba(148,163,184,0.08)',
      border: 'rgba(148,163,184,0.15)',
    },
  },
} as const;

// Helper function to get severity config
export const getSeverityConfig = (severity: 'critical' | 'high' | 'medium' | 'low') => {
  return theme.severity[severity.toLowerCase() as keyof typeof theme.severity] || theme.severity.low;
};

// Helper function to calculate score
export const calculateScore = (findings: Array<{ severity: string }>) => {
  return findings.reduce((score, finding) => {
    const config = getSeverityConfig(finding.severity as any);
    return score + config.weight;
  }, 0);
};

// Gate decision threshold
export const GATE_THRESHOLD = 15;

export const shouldFailGate = (findings: Array<{ severity: string }>) => {
  const hasCritical = findings.some(f => f.severity.toLowerCase() === 'critical');
  const score = calculateScore(findings);
  return hasCritical || score >= GATE_THRESHOLD;
};
