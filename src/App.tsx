import { useState, useEffect } from 'react';
import type { TabKey, Customer, PreCheckRecord, ParameterRecord, PostObservationRecord, AbnormalReport, HandoverLog } from './types';
import { mockCustomers, mockPreChecks, mockParameters, mockObservations, mockAbnormalReports, mockHandoverLogs } from './mockData';
import QueuePanel from './components/QueuePanel';
import PreCheckPanel from './components/PreCheckPanel';
import ParameterPanel from './components/ParameterPanel';
import ObservationPanel from './components/ObservationPanel';
import AbnormalPanel from './components/AbnormalPanel';
import HandoverPanel from './components/HandoverPanel';

const STORAGE_KEY = 'ipl_console_data_v1';

const tabs: { key: TabKey; name: string; icon: string }[] = [
  { key: 'queue', name: '到店队列', icon: '📋' },
  { key: 'precheck', name: '术前核查', icon: '✅' },
  { key: 'parameters', name: '参数记录', icon: '⚙️' },
  { key: 'observation', name: '术后观察', icon: '⏱️' },
  { key: 'abnormal', name: '异常上报', icon: '⚠️' },
  { key: 'handover', name: '交班日志', icon: '📝' },
];

interface StoredData {
  customers: Customer[];
  preChecks: PreCheckRecord[];
  parameters: ParameterRecord[];
  observations: PostObservationRecord[];
  abnormalReports: AbnormalReport[];
  handoverLogs: HandoverLog[];
  lastSaved: number;
}

function loadFromStorage(): StoredData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredData;
    return data;
  } catch (e) {
    console.error('读取本地数据失败', e);
    return null;
  }
}

function saveToStorage(data: StoredData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('保存本地数据失败', e);
  }
}

export default function App() {
  const stored = loadFromStorage();

  const [activeTab, setActiveTab] = useState<TabKey>('queue');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>(stored?.customers ?? mockCustomers);
  const [preChecks, setPreChecks] = useState<PreCheckRecord[]>(stored?.preChecks ?? mockPreChecks);
  const [parameters, setParameters] = useState<ParameterRecord[]>(stored?.parameters ?? mockParameters);
  const [observations, setObservations] = useState<PostObservationRecord[]>(stored?.observations ?? mockObservations);
  const [abnormalReports, setAbnormalReports] = useState<AbnormalReport[]>(stored?.abnormalReports ?? mockAbnormalReports);
  const [handoverLogs, setHandoverLogs] = useState<HandoverLog[]>(stored?.handoverLogs ?? mockHandoverLogs);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const data: StoredData = {
      customers,
      preChecks,
      parameters,
      observations,
      abnormalReports,
      handoverLogs,
      lastSaved: Date.now(),
    };
    saveToStorage(data);
  }, [customers, preChecks, parameters, observations, abnormalReports, handoverLogs]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${y}-${m}-${day} ${weekdays[d.getDay()]} ${hh}:${mm}:${ss}`;
  };

  const updateCustomerStatus = (customerId: string, status: Customer['status']) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status } : c))
    );
  };

  const updateCustomerPlan = (customerId: string, plan: string, author: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              treatmentPlan: plan,
              planUpdatedAt: Date.now(),
              planAuthor: author,
            }
          : c
      )
    );
  };

  const addPreCheck = (record: Omit<PreCheckRecord, 'version' | 'createdAt'>) => {
    setPreChecks((prev) => {
      const versionsForCustomer = prev.filter((p) => p.customerId === record.customerId);
      const nextVersion = versionsForCustomer.length > 0
        ? Math.max(...versionsForCustomer.map((p) => p.version)) + 1
        : 1;
      const full: PreCheckRecord = {
        ...record,
        version: nextVersion,
        createdAt: Date.now(),
      };
      return [full, ...prev];
    });
  };

  const addParameter = (record: Omit<ParameterRecord, 'version' | 'createdAt'>) => {
    setParameters((prev) => {
      const versionsForCustomer = prev.filter((p) => p.customerId === record.customerId);
      const nextVersion = versionsForCustomer.length > 0
        ? Math.max(...versionsForCustomer.map((p) => p.version)) + 1
        : 1;
      const full: ParameterRecord = {
        ...record,
        version: nextVersion,
        createdAt: Date.now(),
      };
      return [full, ...prev];
    });
  };

  const addObservation = (record: PostObservationRecord) => {
    setObservations((prev) => {
      const existing = prev.findIndex((o) => o.customerId === record.customerId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = record;
        return updated;
      }
      return [record, ...prev];
    });
  };

  const addAbnormalReport = (report: AbnormalReport) => {
    setAbnormalReports((prev) => [report, ...prev]);
  };

  const addHandoverLog = (log: HandoverLog) => {
    setHandoverLogs((prev) => [log, ...prev]);
  };

  const activeTabInfo = tabs.find((t) => t.key === activeTab)!;

  const renderPanel = () => {
    const commonProps = {
      customers,
      selectedCustomer,
      setSelectedCustomerId,
      updateCustomerStatus,
    };

    switch (activeTab) {
      case 'queue':
        return <QueuePanel {...commonProps} />;
      case 'precheck':
        return (
          <PreCheckPanel
            {...commonProps}
            preChecks={preChecks}
            addPreCheck={addPreCheck}
            updateCustomerPlan={updateCustomerPlan}
          />
        );
      case 'parameters':
        return (
          <ParameterPanel
            {...commonProps}
            parameters={parameters}
            addParameter={addParameter}
            updateCustomerPlan={updateCustomerPlan}
          />
        );
      case 'observation':
        return (
          <ObservationPanel
            {...commonProps}
            observations={observations}
            addObservation={addObservation}
          />
        );
      case 'abnormal':
        return (
          <AbnormalPanel
            {...commonProps}
            abnormalReports={abnormalReports}
            addAbnormalReport={addAbnormalReport}
          />
        );
      case 'handover':
        return (
          <HandoverPanel
            customers={customers}
            observations={observations}
            abnormalReports={abnormalReports}
            handoverLogs={handoverLogs}
            addHandoverLog={addHandoverLog}
          />
        );
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>光子嫩肤治疗室</h1>
          <div className="subtitle">操作台 v1.0</div>
        </div>
        <nav className="sidebar-nav">
          {tabs.map((tab) => {
            let badge: number | undefined;
            if (tab.key === 'observation') {
              badge = observations.filter((o) => !o.completed).length;
            } else if (tab.key === 'abnormal') {
              badge = abnormalReports.filter((a) => !a.reviewed).length;
            }
            return (
              <div
                key={tab.key}
                className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span>{tab.name}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="nav-badge">{badge}</span>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user">治疗师：王技师</div>
          <div>工号：T2024001</div>
          {stored?.lastSaved && (
            <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.6 }}>
              数据已本地保存
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        <header className="main-header">
          <div className="header-title">
            {activeTabInfo.icon} {activeTabInfo.name}
          </div>
          <div className="header-info">
            <div>
              <span className="status-dot" />
              设备正常
            </div>
            <div>{formatDate(currentTime)}</div>
          </div>
        </header>
        <div className="main-content">{renderPanel()}</div>
      </main>
    </div>
  );
}
