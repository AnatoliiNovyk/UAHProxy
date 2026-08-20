import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './views/DashboardView';
import { ServersView } from './views/ServersView';
import { ServicesInstallerView } from './views/ServicesInstallerView';
import { ConfigEditorView } from './views/ConfigEditorView';
import { RuntimeControlView } from './views/RuntimeControlView';
import { SmonView } from './views/SmonView';
import { ClustersView } from './views/ClustersView';
import { SslWafView } from './views/SslWafView';
import { AlertsAuditView } from './views/AlertsAuditView';
import { SettingsView } from './views/SettingsView';
import { PublicStatusPageView } from './views/PublicStatusPageView';
import { LoginView } from './views/LoginView';

import { Language } from './i18n/translations';
import { Server, SmonTarget, LiveMetrics, User } from './types';
import { api, connectWebSocket } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [lang, setLang] = useState<Language>('uk');

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('uaproxy_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [authChecked, setAuthChecked] = useState(false);

  // Data States
  const [servers, setServers] = useState<Server[]>([]);
  const [smonTargets, setSmonTargets] = useState<SmonTarget[]>([]);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);

  useEffect(() => {
    checkAuthSession();

    const cleanupWs = connectWebSocket((liveMetrics) => {
      setMetrics(liveMetrics);
    });

    // Global Escape Key Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const closeButtons = document.querySelectorAll<HTMLButtonElement>('[data-dismiss-modal]');
        closeButtons.forEach(btn => btn.click());
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cleanupWs();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const checkAuthSession = async () => {
    const token = localStorage.getItem('uaproxy_token');
    if (!token) {
      setCurrentUser(null);
      setAuthChecked(true);
      return;
    }

    try {
      const user = await api.getMe();
      setCurrentUser(user);
      localStorage.setItem('uaproxy_user', JSON.stringify(user));
      fetchInitialData();
    } catch (e) {
      console.warn('Session expired or invalid, please login again.');
      api.logout();
      setCurrentUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  const fetchInitialData = async () => {
    try {
      const results = await Promise.allSettled([
        api.getServers(),
        api.getSmonTargets()
      ]);
      if (results[0].status === 'fulfilled') setServers(results[0].value);
      if (results[1].status === 'fulfilled') setSmonTargets(results[1].value);
    } catch (e) {
      console.error('Error loading UAProxy initial data', e);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    fetchInitialData();
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  // If user opens public status view directly, allow without authentication
  if (currentTab === 'public_status') {
    return <PublicStatusPageView onBackToDashboard={() => setCurrentTab('smon')} />;
  }

  // If not logged in, show LoginView
  if (authChecked && !currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            lang={lang}
            servers={servers}
            metrics={metrics}
            smonTargets={smonTargets}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'servers':
        return <ServersView lang={lang} servers={servers} onRefresh={fetchInitialData} />;
      case 'installer':
        return <ServicesInstallerView lang={lang} servers={servers} onRefresh={fetchInitialData} />;
      case 'configs':
        return <ConfigEditorView lang={lang} servers={servers} />;
      case 'runtime':
        return <RuntimeControlView lang={lang} servers={servers} />;
      case 'smon':
        return <SmonView lang={lang} onOpenPublicStatus={() => setCurrentTab('public_status')} />;
      case 'clusters':
        return <ClustersView lang={lang} servers={servers} />;
      case 'ssl_waf':
        return <SslWafView lang={lang} servers={servers} />;
      case 'alerts':
        return <AlertsAuditView lang={lang} />;
      case 'settings':
        return <SettingsView lang={lang} servers={servers} />;
      default:
        return (
          <DashboardView
            lang={lang}
            servers={servers}
            metrics={metrics}
            smonTargets={smonTargets}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#07090E] text-gray-100 overflow-hidden font-sans antialiased selection:bg-cyan-500 selection:text-black">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          lang={lang}
          setLang={setLang}
          activeAlerts={metrics?.active_alerts || 0}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
