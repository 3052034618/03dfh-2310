import { useState, useEffect, useRef } from 'react';
import type { Customer, PostObservationRecord, AreaReaction } from '../types';

interface Props {
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: string | null) => void;
  updateCustomerStatus: (id: string, status: Customer['status']) => void;
  observations: PostObservationRecord[];
  addObservation: (record: PostObservationRecord) => void;
}

const AREAS = ['额头', '左颊', '右颊', '鼻部', '鼻翼', '下颌', '口周', '颈部'];
const REDNESS_LEVELS = ['无', '轻度', '中度', '明显'] as const;
const BURNING_LEVELS = ['无', '轻微', '明显', '强烈'] as const;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function createAreaReactions(): AreaReaction[] {
  return AREAS.map((area) => ({
    area,
    redness: '无',
    burning: '无',
    remark: '',
  }));
}

export default function ObservationPanel({
  customers,
  selectedCustomer,
  setSelectedCustomerId,
  updateCustomerStatus,
  observations,
  addObservation,
}: Props) {
  const observingList = customers.filter((c) => ['treating', 'observing'].includes(c.status));
  const existingObs = selectedCustomer
    ? observations.find((o) => o.customerId === selectedCustomer.id)
    : null;

  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState('');
  const timerRef = useRef<number | null>(null);

  const [areaReactions, setAreaReactions] = useState<AreaReaction[]>(createAreaReactions());
  const [coldCompressDone, setColdCompressDone] = useState(false);
  const [repairMaskDone, setRepairMaskDone] = useState(false);
  const [sunscreenAdviceDone, setSunscreenAdviceDone] = useState(false);

  useEffect(() => {
    if (existingObs) {
      setElapsed(existingObs.duration);
      setStartTime(existingObs.startTime);
      setAreaReactions(existingObs.areaReactions.length > 0 ? existingObs.areaReactions : createAreaReactions());
      setColdCompressDone(existingObs.coldCompressDone);
      setRepairMaskDone(existingObs.repairMaskDone);
      setSunscreenAdviceDone(existingObs.sunscreenAdviceDone);
      setTimerRunning(!existingObs.completed);
    } else {
      setElapsed(0);
      setStartTime('');
      setAreaReactions(createAreaReactions());
      setColdCompressDone(false);
      setRepairMaskDone(false);
      setSunscreenAdviceDone(false);
      setTimerRunning(false);
    }
  }, [selectedCustomer?.id, existingObs]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const handleStartTimer = () => {
    if (!selectedCustomer) return;
    if (!startTime) {
      const now = new Date();
      setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
    setTimerRunning(true);
    updateCustomerStatus(selectedCustomer.id, 'observing');
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
  };

  const handleResetTimer = () => {
    setElapsed(0);
    setStartTime('');
    setTimerRunning(false);
  };

  const updateAreaReaction = (idx: number, field: keyof AreaReaction, value: string) => {
    setAreaReactions((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const allDone = coldCompressDone && repairMaskDone && sunscreenAdviceDone && elapsed >= 1200;

  const handleSave = (completed: boolean) => {
    if (!selectedCustomer) return;

    const record: PostObservationRecord = {
      customerId: selectedCustomer.id,
      startTime: startTime || '未开始',
      duration: elapsed,
      areaReactions,
      coldCompressDone,
      repairMaskDone,
      sunscreenAdviceDone,
      operator: '治疗师-王',
      completed,
    };

    addObservation(record);
    if (completed) {
      updateCustomerStatus(selectedCustomer.id, 'completed');
      setTimerRunning(false);
    }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: '20px' }}>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">观察中客户</div>
        </div>
        <div className="panel-body" style={{ padding: '12px' }}>
          {observingList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏱️</div>
              <div className="empty-state-text">暂无观察中客户</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {observingList.map((c) => {
                const obs = observations.find((o) => o.customerId === c.id);
                return (
                  <div
                    key={c.id}
                    className={`queue-card ${selectedCustomer?.id === c.id ? 'selected' : ''}`}
                    style={{ padding: '12px 14px' }}
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                          {obs && !obs.completed ? `已观察 ${formatTime(obs.duration)}` : c.appointment}
                        </div>
                      </div>
                      {obs && obs.completed && <span className="tag tag-success">已完成</span>}
                      {obs && !obs.completed && <span className="tag tag-info">观察中</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div>
        {!selectedCustomer ? (
          <div className="panel">
            <div className="panel-body">
              <div className="empty-state">
                <div className="empty-state-icon">👆</div>
                <div className="empty-state-text">请从左侧选择客户开始术后观察</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-2" style={{ gridTemplateColumns: '280px 1fr', marginBottom: '20px' }}>
              <div className="timer-box">
                <div className="timer-label">术后观察计时</div>
                <div className="timer-display">{formatTime(elapsed)}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                  {startTime ? `开始时间 ${startTime}` : '尚未开始'}
                </div>
                <div style={{ fontSize: '12px', color: elapsed >= 1200 ? '#58d68d' : '#f5b041' }}>
                  {elapsed >= 1200 ? '✅ 已达到建议观察时长（20分钟）' : '建议观察时长 ≥ 20分钟'}
                </div>
                <div className="timer-controls">
                  {!timerRunning ? (
                    <button className="btn btn-success btn-sm" onClick={handleStartTimer}>
                      {elapsed > 0 ? '继续' : '开始观察'}
                    </button>
                  ) : (
                    <button className="btn btn-warning btn-sm" onClick={handlePauseTimer}>暂停</button>
                  )}
                  <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} onClick={handleResetTimer}>
                    重置
                  </button>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">客户信息</div>
                </div>
                <div className="panel-body">
                  <div className="info-list">
                    <div className="info-item">
                      <span className="label">姓名</span>
                      <span className="value">{selectedCustomer.name}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">项目</span>
                      <span className="value">{selectedCustomer.appointment}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">主治医生</span>
                      <span className="value">{selectedCustomer.doctor}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">签到时间</span>
                      <span className="value">{selectedCustomer.checkInTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: '20px' }}>
              <div className="panel-header">
                <div className="panel-title">📊 分区皮肤反应记录</div>
              </div>
              <div className="panel-body">
                <div className="area-reaction-grid">
                  {areaReactions.map((reaction, idx) => (
                    <div key={reaction.area} className="area-reaction-card">
                      <div className="area-name">{reaction.area}</div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>泛红程度</label>
                        <div className="checkbox-group">
                          {REDNESS_LEVELS.map((lv) => (
                            <label
                              key={lv}
                              className={`checkbox-item ${reaction.redness === lv ? 'checked' : ''}`}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => updateAreaReaction(idx, 'redness', lv)}
                            >
                              <input type="radio" checked={reaction.redness === lv} readOnly />
                              {lv}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>灼热感</label>
                        <div className="checkbox-group">
                          {BURNING_LEVELS.map((lv) => (
                            <label
                              key={lv}
                              className={`checkbox-item ${reaction.burning === lv ? 'checked' : ''}`}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => updateAreaReaction(idx, 'burning', lv)}
                            >
                              <input type="radio" checked={reaction.burning === lv} readOnly />
                              {lv}
                            </label>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="备注（选填）"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                        value={reaction.remark || ''}
                        onChange={(e) => updateAreaReaction(idx, 'remark', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: '20px' }}>
              <div className="panel-header">
                <div className="panel-title">✅ 术后护理执行确认</div>
              </div>
              <div className="panel-body">
                <div className="checkoff-list">
                  <div
                    className={`checkoff-item ${coldCompressDone ? 'done' : ''}`}
                    onClick={() => setColdCompressDone(!coldCompressDone)}
                  >
                    <div className="checkoff-checkbox">✓</div>
                    <div className="checkoff-text">❄️ 冷敷处理（治疗后即刻冷敷 15-20 分钟，降低皮温减轻红肿）</div>
                    {coldCompressDone && <div className="checkoff-time">已完成</div>}
                  </div>
                  <div
                    className={`checkoff-item ${repairMaskDone ? 'done' : ''}`}
                    onClick={() => setRepairMaskDone(!repairMaskDone)}
                  >
                    <div className="checkoff-checkbox">✓</div>
                    <div className="checkoff-text">🧴 修复面膜（医用冷敷贴/修复面膜，告知客户术后连续使用 3-7 天）</div>
                    {repairMaskDone && <div className="checkoff-time">已完成</div>}
                  </div>
                  <div
                    className={`checkoff-item ${sunscreenAdviceDone ? 'done' : ''}`}
                    onClick={() => setSunscreenAdviceDone(!sunscreenAdviceDone)}
                  >
                    <div className="checkoff-checkbox">✓</div>
                    <div className="checkoff-text">
                      ☀️ 防晒叮嘱（严格防晒 SPF30+ PA+++，避免暴晒、高温环境，2周内不使用去角质产品）
                    </div>
                    {sunscreenAdviceDone && <div className="checkoff-time">已完成</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <span>📌</span>
              <div>
                如出现水疱、明显灼痛、持续红肿不退等异常，请立即前往「异常上报」模块登记，并通知主治医生。
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => handleSave(false)}>
                💾 暂存观察记录
              </button>
              <button
                className="btn btn-success btn-lg"
                onClick={() => handleSave(true)}
                disabled={!allDone}
              >
                {!allDone && elapsed < 1200
                  ? `⏱️ 观察时长不足（还需 ${formatTime(1200 - elapsed)}）`
                  : !allDone
                  ? '请完成所有护理项'
                  : '✅ 完成观察并离院'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
