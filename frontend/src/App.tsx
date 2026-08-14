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

import { Language } from './i18n/translations';
import { Server, SmonTarget, Cluster, AuditLog, LiveMetrics } from './types';
import { api, connectWebSocket } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [lang, setLang] = useState<Language>('uk');

  // Data States
  const [servers, setServers] = useState<Server[]>([]);
  const [smonTargets, setSmonTargets] = useState<SmonTarget[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);

  useEffect(() => {
    fetchInitialData();

    // Subscribe to WebSockets live streaming feed
    const cleanupWs = connectWebSocket((liveMetrics) => {
      setMetrics(liveMetrics);
    });

    return () => cleanupWs();
  }, []);

  const fetchInitialData = async () => {
    try {
      const results = await Promise.allSettled([
        api.getServers(),
        api.getSmonTargets(),
        api.getClusters(),
        api.getAuditLogs()
      ]);
      if (results[0].status === 'fulfilled') setServers(results[0].value);
      if (results[1].status === 'fulfilled') setSmonTargets(results[1].value);
      if (results[2].status === 'fulfilled') setClusters(results[2].value);
      if (results[3].status === 'fulfilled') setAuditLogs(results[3].value);
    } catch (e) {
      console.error('Error loading UAProxy initial data', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        lang={lang}
        setLang={setLang}
        activeAlerts={metrics?.active_alerts || 0}
      />

      <div className="flex-1 flex">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          lang={lang}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              lang={lang}
              servers={servers}
              metrics={metrics}
              smonTargets={smonTargets}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'servers' && (
            <ServersView
              lang={lang}
              servers={servers}
              onRefresh={fetchInitialData}
            />
          )}

          {currentTab === 'installer' && (
            <ServicesInstallerView
              lang={lang}
              servers={servers}
              onRefresh={fetchInitialData}
            />
          )}

          {currentTab === 'configs' && (
            <ConfigEditorView
              lang={lang}
              servers={servers}
            />
          )}

          {currentTab === 'runtime' && (
            <RuntimeControlView
              lang={lang}
              servers={servers}
            />
          )}

          {currentTab === 'smon' && (
            <SmonView
              lang={lang}
              smonTargets={smonTargets}
              onRefresh={fetchInitialData}
            />
          )}

          {currentTab === 'clusters' && (
            <ClustersView
              lang={lang}
              clusters={clusters}
              servers={servers}
            />
          )}

          {currentTab === 'ssl_waf' && (
            <SslWafView lang={lang} />
          )}

          {currentTab === 'alerts' && (
            <AlertsAuditView
              lang={lang}
              auditLogs={auditLogs}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView lang={lang} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
