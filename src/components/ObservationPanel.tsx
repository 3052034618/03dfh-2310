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
  sec = Math.max(0, Math.floor(sec));
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

function mergeAreaReactions(existing: AreaReaction[]): AreaReaction[] {
  return AREAS.map((area) => {
    const found = existing.find((r) => r.area === area);
    if (found) return found;
    return { area, redness: '无', burning: '无', remark: '' };
  });
}

function calcElapsedSec(
  startTimestamp: number | null,
  pauseStart: number | null,
  pausedDuration: number,
  now: number
): number {
  if (!startTimestamp) return 0;
  const end = pauseStart ?? now;
  const ms = end - startTimestamp - pausedDuration;
  return Math.max(0, Math.floor(ms / 1000));
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

  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [pauseStart, setPauseStart] = useState<number | null>(null);
  const [pausedDuration, setPausedDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState('');
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);

  const [areaReactions, setAreaReactions] = useState<AreaReaction[]>(createAreaReactions());
  const [coldCompressDone, setColdCompressDone] = useState(false);
  const [repairMaskDone, setRepairMaskDone] = useState(false);
  const [sunscreenAdviceDone, setSunscreenAdviceDone] = useState(false);

  useEffect(() => {
    if (existingObs) {
      setStartTimestamp(existingObs.startTimestamp ?? null);
      setPauseStart(existingObs.pauseStart ?? null);
      setPausedDuration(existingObs.pausedDuration ?? 0);
      setStartTime(existingObs.startTime);
      setAreaReactions(
        existingObs.areaReactions.length > 0
          ? mergeAreaReactions(existingObs.areaReactions)
          : createAreaReactions()
      );
      setColdCompressDone(existingObs.coldCompressDone);
      setRepairMaskDone(existingObs.repairMaskDone);
      setSunscreenAdviceDone(existingObs.sunscreenAdviceDone);
    } else {
      setStartTimestamp(null);
      setPauseStart(null);
      setPausedDuration(0);
      setStartTime('');
      setAreaReactions(createAreaReactions());
      setColdCompressDone(false);
      setRepairMaskDone(false);
      setSunscreenAdviceDone(false);
    }
  }, [selectedCustomer?.id, existingObs]);

  useEffect(() => {
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const isRunning = !!startTimestamp && !pauseStart && !existingObs?.completed;
  const isPaused = !!startTimestamp && !!pauseStart;
  const hasStarted = !!startTimestamp;

  const elapsed = calcElapsedSec(startTimestamp, pauseStart, pausedDuration, now);

  const handleStartTimer = () => {
    if (!selectedCustomer) return;
    if (!hasStarted) {
      const d = new Date();
      setStartTimestamp(d.getTime());
      setPauseStart(null);
      setPausedDuration(0);
      setStartTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    } else if (isPaused) {
      setPausedDuration((prev) => prev + (Date.now() - (pauseStart ?? 0)));
      setPauseStart(null);
    }
    updateCustomerStatus(selectedCustomer.id, 'observing');
  };

  const handlePauseTimer = () => {
    if (!isRunning) return;
    setPauseStart(Date.now());
  };

  const handleResetTimer = () => {
    setStartTimestamp(null);
    setPauseStart(null);
    setPausedDuration(0);
    setStartTime('');
  };

  const updateAreaReaction = (idx: number, field: keyof AreaReaction, value: string) => {
    setAreaReactions((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const allDone = coldCompressDone && repairMaskDone && sunscreenAdviceDone && elapsed >= 1200;

  const handleSave = (completed: boolean) => {
    if (!selectedCustomer) return;

    let finalStart = startTimestamp;
    let finalPause = pauseStart;
    let finalPaused = pausedDuration;
    if (completed && isRunning) {
      finalPaused = pausedDuration;
      finalPause = null;
    } else if (completed && isPaused) {
      finalPause = null;
    }
    if (!hasStarted) {
      finalStart = null;
      finalPause = null;
      finalPaused = 0;
    }

    const record: PostObservationRecord = {
      customerId: selectedCustomer.id,
      startTime: startTime || '未开始',
      duration: finalStart
        ? calcElapsedSec(finalStart, finalPause, finalPaused, completed ? (pauseStart ?? Date.now()) : Date.now())
        : 0,
      startTimestamp: finalStart,
      pauseStart: finalPause,
      pausedDuration: finalPaused,
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
                const liveElapsed = obs
                  ? calcElapsedSec(obs.startTimestamp ?? null, obs.pauseStart ?? null, obs.pausedDuration ?? 0, now)
                  : 0;
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
                          {obs && !obs.completed ? `已观察 ${formatTime(liveElapsed)}` : c.appointment}
                        </div>
                      </div>
                      {obs && obs.completed && <span className="tag tag-success">已完成</span>}
                      {obs && !obs.completed && (
                        <span className={`tag ${obs.pauseStart ? 'tag-warning' : 'tag-info'}`}>
                          {obs.pauseStart ? '已暂停' : '观察中'}
                        </span>
                      )}
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
                <div className="timer-label">
                  术后观察计时 {isPaused && <span style={{ color: '#f5b041' }}>(已暂停)</span>}
                </div>
                <div className="timer-display">{formatTime(elapsed)}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                  {startTime ? `开始时间 ${startTime}` : '尚未开始'}
                </div>
                <div style={{ fontSize: '12px', color: elapsed >= 1200 ? '#58d68d' : '#f5b041' }}>
                  {elapsed >= 1200 ? '✅ 已达到建议观察时长（20分钟）' : `建议观察时长 ≥ 20分钟，还需 ${formatTime(1200 - elapsed)}`}
                </div>
                <div className="timer-controls">
                  {!hasStarted ? (
                    <button className="btn btn-success btn-sm" onClick={handleStartTimer}>开始观察</button>
                  ) : isRunning ? (
                    <button className="btn btn-warning btn-sm" onClick={handlePauseTimer}>暂停</button>
                  ) : (
                    <button className="btn btn-success btn-sm" onClick={handleStartTimer}>继续</button>
                  )}
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                    onClick={handleResetTimer}
                  >
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
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  共 {AREAS.length} 个区域，缺失项已自动补出，可随时补填
                </span>
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
                计时按真实时间持续进行：切换页面、暂存记录、刷新甚至关闭页面后再回来，都将自动延续之前的观察进度。
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
