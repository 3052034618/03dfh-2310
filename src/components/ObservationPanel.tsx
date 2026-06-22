import { useState, useEffect, useRef } from 'react';
import type { Customer, PostObservationRecord, AreaReaction, TimelineEvent, TimelineEventType } from '../types';

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
const OPERATOR = '治疗师-王';

function formatTime(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
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

function dotClassForType(type: TimelineEventType): string {
  switch (type) {
    case 'start': return 'start';
    case 'pause': return 'pause';
    case 'resume': return 'resume';
    case 'save': return 'save';
    case 'care_cold':
    case 'care_mask':
    case 'care_sunscreen': return 'care';
    case 'complete': return 'complete';
    case 'reset': return 'reset';
    default: return '';
  }
}

function dotIconForType(type: TimelineEventType): string {
  switch (type) {
    case 'start': return '▶';
    case 'pause': return '⏸';
    case 'resume': return '⏵';
    case 'save': return '💾';
    case 'care_cold': return '❄';
    case 'care_mask': return '🧴';
    case 'care_sunscreen': return '☀';
    case 'complete': return '✓';
    case 'reset': return '⟲';
    default: return '•';
  }
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
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

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
      setTimeline(existingObs.timeline ?? []);
    } else {
      setStartTimestamp(null);
      setPauseStart(null);
      setPausedDuration(0);
      setStartTime('');
      setAreaReactions(createAreaReactions());
      setColdCompressDone(false);
      setRepairMaskDone(false);
      setSunscreenAdviceDone(false);
      setTimeline([]);
    }
  }, [selectedCustomer?.id]);

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

  const appendTimelineAndPersist = (
    evt: Omit<TimelineEvent, 'timestamp' | 'operator'>,
    stateOverrides: Partial<{
      startTimestamp: number | null;
      pauseStart: number | null;
      pausedDuration: number;
      startTime: string;
      coldCompressDone: boolean;
      repairMaskDone: boolean;
      sunscreenAdviceDone: boolean;
      areaReactions: AreaReaction[];
      completed: boolean;
      status: Customer['status'];
    }> = {}
  ) => {
    if (!selectedCustomer) return;
    const ts = Date.now();
    const event: TimelineEvent = { ...evt, timestamp: ts, operator: OPERATOR };
    const nextTimeline = [...timeline, event];

    const nextStart = stateOverrides.startTimestamp ?? startTimestamp;
    const nextPause = stateOverrides.pauseStart ?? pauseStart;
    const nextPaused = stateOverrides.pausedDuration ?? pausedDuration;
    const nextStartTime = stateOverrides.startTime ?? startTime;
    const nextCold = stateOverrides.coldCompressDone ?? coldCompressDone;
    const nextMask = stateOverrides.repairMaskDone ?? repairMaskDone;
    const nextSun = stateOverrides.sunscreenAdviceDone ?? sunscreenAdviceDone;
    const nextAreas = stateOverrides.areaReactions ?? areaReactions;
    const nextCompleted = !!stateOverrides.completed;

    const nextDuration = nextStart
      ? calcElapsedSec(nextStart, nextPause, nextPaused, stateOverrides.completed ? (pauseStart ?? ts) : ts)
      : 0;

    const record: PostObservationRecord = {
      customerId: selectedCustomer.id,
      startTime: nextStartTime || '未开始',
      duration: nextDuration,
      startTimestamp: nextStart,
      pauseStart: nextPause,
      pausedDuration: nextPaused,
      timeline: nextTimeline,
      areaReactions: nextAreas,
      coldCompressDone: nextCold,
      repairMaskDone: nextMask,
      sunscreenAdviceDone: nextSun,
      operator: OPERATOR,
      completed: nextCompleted,
    };

    setTimeline(nextTimeline);
    if (stateOverrides.status) {
      updateCustomerStatus(selectedCustomer.id, stateOverrides.status);
    } else if (nextStart && !nextCompleted && selectedCustomer.status !== 'observing') {
      updateCustomerStatus(selectedCustomer.id, 'observing');
    }
    addObservation(record);
  };

  const handleStartTimer = () => {
    if (!selectedCustomer) return;
    if (!hasStarted) {
      const d = new Date();
      const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const newStart = d.getTime();
      setStartTimestamp(newStart);
      setPauseStart(null);
      setPausedDuration(0);
      setStartTime(hhmm);
      appendTimelineAndPersist(
        { type: 'start', label: '开始观察', detail: '进入术后观察期' },
        { startTimestamp: newStart, pauseStart: null, pausedDuration: 0, startTime: hhmm, status: 'observing' }
      );
    } else if (isPaused) {
      const addedPaused = pausedDuration + (Date.now() - (pauseStart ?? 0));
      setPausedDuration(addedPaused);
      setPauseStart(null);
      appendTimelineAndPersist(
        { type: 'resume', label: '继续观察', detail: `暂停时长 ${formatTime(Math.floor((Date.now() - (pauseStart ?? 0)) / 1000))}` },
        { pauseStart: null, pausedDuration: addedPaused }
      );
    }
  };

  const handlePauseTimer = () => {
    if (!isRunning) return;
    const ps = Date.now();
    setPauseStart(ps);
    appendTimelineAndPersist(
      { type: 'pause', label: '暂停观察', detail: `已观察 ${formatTime(elapsed)}` },
      { pauseStart: ps }
    );
  };

  const handleResetTimer = () => {
    setStartTimestamp(null);
    setPauseStart(null);
    setPausedDuration(0);
    setStartTime('');
    appendTimelineAndPersist(
      { type: 'reset', label: '重置观察', detail: '清空计时，重新开始' },
      { startTimestamp: null, pauseStart: null, pausedDuration: 0, startTime: '' }
    );
  };

  const updateAreaReaction = (idx: number, field: keyof AreaReaction, value: string) => {
    setAreaReactions((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleToggleCare = (
    key: 'cold' | 'mask' | 'sun',
    nextValue: boolean
  ) => {
    if (key === 'cold') {
      setColdCompressDone(nextValue);
      appendTimelineAndPersist(
        {
          type: 'care_cold',
          label: nextValue ? '完成冷敷处理' : '取消冷敷标记',
          detail: '术后即刻冷敷 15-20 分钟',
        },
        { coldCompressDone: nextValue }
      );
    } else if (key === 'mask') {
      setRepairMaskDone(nextValue);
      appendTimelineAndPersist(
        {
          type: 'care_mask',
          label: nextValue ? '修复面膜已告知并完成' : '取消修复面膜标记',
          detail: '术后连续使用 3-7 天医用冷敷贴',
        },
        { repairMaskDone: nextValue }
      );
    } else {
      setSunscreenAdviceDone(nextValue);
      appendTimelineAndPersist(
        {
          type: 'care_sunscreen',
          label: nextValue ? '防晒叮嘱已完成' : '取消防晒叮嘱标记',
          detail: 'SPF30+ PA+++ 严格防晒，2周内避免暴晒/去角质',
        },
        { sunscreenAdviceDone: nextValue }
      );
    }
  };

  const allDone = coldCompressDone && repairMaskDone && sunscreenAdviceDone && elapsed >= 1200;

  const handleSave = (completed: boolean) => {
    if (!selectedCustomer) return;

    appendTimelineAndPersist(
      completed
        ? { type: 'complete', label: '观察完成，准予离院', detail: `累计观察 ${formatTime(elapsed)}` }
        : { type: 'save', label: '暂存观察记录', detail: `已观察 ${formatTime(elapsed)}，分区反应和护理项已保存` },
      {
        areaReactions,
        completed,
        status: completed ? 'completed' : undefined,
      }
    );
  };

  const sortedTimeline = [...timeline].sort((a, b) => a.timestamp - b.timestamp);

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

            <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 320px', marginBottom: '20px', gap: '20px' }}>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">📊 分区皮肤反应记录</div>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    共 {AREAS.length} 个区域，可随时补填
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

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">⏳ 观察时间线</div>
                </div>
                <div className="panel-body" style={{ padding: '12px' }}>
                  {sortedTimeline.length === 0 ? (
                    <div className="empty-state" style={{ padding: '30px 10px' }}>
                      <div className="empty-state-icon">📝</div>
                      <div className="empty-state-text">点击「开始观察」生成时间线</div>
                    </div>
                  ) : (
                    <div className="timeline">
                      {sortedTimeline.map((evt, i) => (
                        <div key={`${evt.timestamp}-${i}`} className="timeline-item">
                          <div className={`timeline-dot ${dotClassForType(evt.type)}`}>
                            {dotIconForType(evt.type)}
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-content-head">
                              <div className="timeline-label">{evt.label}</div>
                              <div className="timeline-time">{formatDateTime(evt.timestamp)}</div>
                            </div>
                            {evt.detail && <div className="timeline-detail">{evt.detail}</div>}
                            <div className="timeline-operator">{evt.operator}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: '20px' }}>
              <div className="panel-header">
                <div className="panel-title">✅ 术后护理执行确认</div>
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  每项勾选将即时写入时间线并自动保存
                </span>
              </div>
              <div className="panel-body">
                <div className="checkoff-list">
                  <div
                    className={`checkoff-item ${coldCompressDone ? 'done' : ''}`}
                    onClick={() => handleToggleCare('cold', !coldCompressDone)}
                  >
                    <div className="checkoff-checkbox">✓</div>
                    <div className="checkoff-text">❄️ 冷敷处理（治疗后即刻冷敷 15-20 分钟，降低皮温减轻红肿）</div>
                    {coldCompressDone && <div className="checkoff-time">已完成</div>}
                  </div>
                  <div
                    className={`checkoff-item ${repairMaskDone ? 'done' : ''}`}
                    onClick={() => handleToggleCare('mask', !repairMaskDone)}
                  >
                    <div className="checkoff-checkbox">✓</div>
                    <div className="checkoff-text">🧴 修复面膜（医用冷敷贴/修复面膜，告知客户术后连续使用 3-7 天）</div>
                    {repairMaskDone && <div className="checkoff-time">已完成</div>}
                  </div>
                  <div
                    className={`checkoff-item ${sunscreenAdviceDone ? 'done' : ''}`}
                    onClick={() => handleToggleCare('sun', !sunscreenAdviceDone)}
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
                开始观察、暂停、继续、勾选护理项等操作会<strong>即时写入时间线并自动保存</strong>，切到其他窗口或刷新页面都不会丢失，回到本面板后按真实时间续算。
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
