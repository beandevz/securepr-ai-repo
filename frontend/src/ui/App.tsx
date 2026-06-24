
import { NavLink, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { DashboardPage } from './pages/DashboardPage';
import { ConnectRepoPage } from './pages/ConnectRepoPage';
import QueueMonitorPage from './pages/QueueMonitorPage';
import { ResultViewerPageEnhanced } from './pages/ResultViewerPageEnhanced';
import { GitHubPRViewPage } from './pages/GitHubPRViewPage';
import { RagManagerPage } from './pages/RagManagerPage';
import { theme } from './theme';

type NavItem = {
  to: string;
  label: string;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/connect', label: 'Connect Repos' },
  { to: '/queue', label: 'Queue' },
  { to: '/rag', label: 'RAG Manager' },
];

export default function App() {
  return (
    <ErrorBoundary>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: theme.colors.bg,
        fontFamily: theme.fonts.ui,
      }}>
        {/* Top Navigation */}
        <nav style={{
          height: '52px',
          flexShrink: 0,
          background: 'rgba(6,8,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              background: `linear-gradient(135deg, ${theme.colors.blue} 0%, ${theme.colors.cyan} 100%)`,
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}>
              🔒
            </div>
            <div style={{
              fontFamily: theme.fonts.ui,
              fontWeight: theme.fontWeights.extrabold,
              fontSize: '15px',
              color: theme.colors.text,
              letterSpacing: '-0.3px',
            }}>
              Secure<span style={{ color: theme.colors.cyan2 }}>PR</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '20px', background: theme.colors.border2 }} />

          <div style={{ display: 'flex', gap: '2px' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontFamily: theme.fonts.ui,
                  fontWeight: theme.fontWeights.medium,
                  color: isActive ? theme.colors.text : theme.colors.text2,
                  background: isActive ? theme.colors.surface2 : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              background: 'rgba(16,185,129,0.1)',
              border: `1px solid rgba(16,185,129,0.25)`,
              borderRadius: '100px',
              fontFamily: theme.fonts.mono,
              fontSize: '11px',
              color: theme.colors.green2,
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: theme.colors.green2,
              }} />
              All systems normal
            </div>
          </div>
        </nav>

        {/* Main Content Area with Sidebar */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            width: '220px',
            flexShrink: 0,
            background: theme.colors.bg1,
            borderRight: `1px solid ${theme.colors.border}`,
            padding: '20px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <div style={{
              padding: '4px 20px 8px',
              fontFamily: theme.fonts.mono,
              fontSize: '10px',
              color: theme.colors.text3,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}>
              Overview
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  margin: '0 10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: theme.fonts.ui,
                  fontSize: '13px',
                  color: isActive ? theme.colors.blue2 : theme.colors.text2,
                  background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                })}
              >
                <span style={{ fontSize: '15px' }}>
                  {item.to === '/' ? '📊' : item.to === '/connect' ? '🔗' : item.to === '/queue' ? '⏳' : '📚'}
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Routes */}
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/connect" element={<ConnectRepoPage />} />
            <Route path="/queue" element={<QueueMonitorPage />} />
            <Route path="/results/:jobId" element={<ResultViewerPageEnhanced />} />
            <Route path="/github-pr/:jobId" element={<GitHubPRViewPage />} />
            <Route path="/rag" element={<RagManagerPage />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  );
}
