import { useState, useMemo } from 'react';
import type { Customer, PostObservationRecord, AbnormalReport, HandoverLog } from '../types';

interface Props {
  customers: Customer[];
  observations: PostObservationRecord[];
  abnormalReports: AbnormalReport[];
  handoverLogs: HandoverLog[];
  addHandoverLog: (log: HandoverLog) => void;
}

type StageType = 'blocked' | 'time' | 'reaction' | 'care' | 'ready';

interface StageInfo {
  stage: StageType;
  stageText: string;
  blockText: string;
  elapsed: number;
}

function formatTime(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

function getObservationStageInfo(o: PostObservationRecord): StageInfo {
  const now = Date.now();
  const elapsed = calcElapsedSec(o.startTimestamp ?? null, o.pauseStart ?? null, o.pausedDuration ?? 0, now);

  if (!o.startTimestamp) {
    return { stage: 'blocked', stageText: '未开始', blockText: '尚未开始观察', elapsed: 0 };
  }

  if (o.pauseStart) {
    const lastEvent = [...(o.timeline ?? [])].sort((a, b) => b.timestamp - a.timestamp)[0];
    const pauseReason = lastEvent?.detail || '客户离位/临时中断';
    return { stage: 'blocked', stageText: '已暂停', blockText: `暂停中：${pauseReason}（已观察 ${formatTime(elapsed)}）`, elapsed };
  }

  if (!o.coldCompressDone) {
    return { stage: 'care', stageText: '待护理', blockText: `卡在「冷敷处理」（已观察 ${formatTime(elapsed)}）`, elapsed };
  }
  if (!o.repairMaskDone) {
    return { stage: 'care', stageText: '待护理', blockText: `卡在「修复面膜」（已观察 ${formatTime(elapsed)}）`, elapsed };
  }
  if (!o.sunscreenAdviceDone) {
    return { stage: 'care', stageText: '待护理', blockText: `卡在「防晒叮嘱」（已观察 ${formatTime(elapsed)}）`, elapsed };
  }

  if (elapsed < 1200) {
    return {
      stage: 'time',
      stageText: '待观察',
      blockText: `观察时长不足（已观察 ${formatTime(elapsed)}，还需 ${formatTime(1200 - elapsed)}）`,
      elapsed,
    };
  }

  const anyReaction = o.areaReactions.some((r) => r.redness !== '无' || r.burning !== '无' || (r.remark && r.remark.trim()));
  if (!anyReaction) {
    return { stage: 'reaction', stageText: '待反应', blockText: `尚未填写分区反应（已观察 ${formatTime(elapsed)}）`, elapsed };
  }

  return { stage: 'ready', stageText: '可完成', blockText: `满足离院条件，待确认（已观察 ${formatTime(elapsed)}）`, elapsed };
}

export default function HandoverPanel({
  customers,
  observations,
  abnormalReports,
  handoverLogs,
  addHandoverLog,
}: Props) {
  const now = Date.now();

  const unfinishedObservationsList = useMemo(
    () =>
      observations
        .filter((o) => !o.completed)
        .map((o) => {
          const c = customers.find((cu) => cu.id === o.customerId);
          const stageInfo = getObservationStageInfo(o);
          return {
            customerId: o.customerId,
            customerName: c?.name || '未知',
            customer: c,
            stageInfo,
          };
        }),
    [observations, customers, now]
  );

  const unfinishedObservationsPlain = unfinishedObservationsList.map(
    (x) => `${x.customerId} ${x.customerName} — ${x.stageInfo.blockText}`
  );

  const photosPending = customers
    .filter((c) => c.photoRequired && c.status !== 'completed')
    .map((c) => `${c.id} ${c.name}`);

  const doctorReviews = customers
    .filter((c) => c.needsDoctorReview)
    .map((c) => `${c.id} ${c.name}`);

  const pendingAbnormals = abnormalReports
    .filter((a) => !a.reviewed)
    .map((a) => `${a.id} ${a.customerName}-${a.typeLabel}`);

  const [nextOperator, setNextOperator] = useState('');
  const [remark, setRemark] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const canSubmit = nextOperator.trim() !== '';

  const handleHandover = () => {
    if (!canSubmit) return;

    const nowDate = new Date();
    const y = nowDate.getFullYear();
    const m = String(nowDate.getMonth() + 1).padStart(2, '0');
    const d = String(nowDate.getDate()).padStart(2, '0');
    const hh = String(nowDate.getHours()).padStart(2, '0');
    const mm = String(nowDate.getMinutes()).padStart(2, '0');

    const log: HandoverLog = {
      id: `HO${String(handoverLogs.length + 1).padStart(3, '0')}`,
      timestamp: `${y}-${m}-${d} ${hh}:${mm}`,
      shiftOperator: '治疗师-王',
      nextOperator: nextOperator.trim(),
      unfinishedObservations: unfinishedObservationsPlain,
      photosPending,
      doctorReviews,
      abnormalReports: pendingAbnormals,
      remark: remark.trim() || undefined,
    };

    addHandoverLog(log);
    setShowSuccess(true);
    setNextOperator('');
    setRemark('');
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const totalIssues =
    unfinishedObservationsList.length +
    photosPending.length +
    doctorReviews.length +
    pendingAbnormals.length;

  const stageCounts = unfinishedObservationsList.reduce(
    (acc, x) => {
      acc[x.stageInfo.stage] = (acc[x.stageInfo.stage] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {showSuccess && (
        <div className="alert alert-success">
          <span>✅</span>
          <div>交班记录已成功生成并归档，请提醒接班人员查阅。</div>
        </div>
      )}

      <div className="summary-grid">
        <div className="summary-card warning">
          <div className="summary-card-label">⏱️ 未完成观察</div>
          <div className="summary-card-value">{unfinishedObservationsList.length}</div>
          {unfinishedObservationsList.length > 0 && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 14px', marginBottom: '8px' }}>
                {stageCounts.blocked ? <span className="stage-pill blocked">已暂停/未开始 {stageCounts.blocked}</span> : null}
                {stageCounts.time ? <span className="stage-pill time">时长不足 {stageCounts.time}</span> : null}
                {stageCounts.reaction ? <span className="stage-pill reaction">待填反应 {stageCounts.reaction}</span> : null}
                {stageCounts.care ? <span className="stage-pill care">待完成护理 {stageCounts.care}</span> : null}
                {stageCounts.ready ? <span className="stage-pill blocked" style={{ background: '#e8f8f0', color: '#27ae60', borderColor: '#a2d9b4' }}>可离院 {stageCounts.ready}</span> : null}
              </div>
              <div className="summary-sublist">
                {unfinishedObservationsList.map((x) => (
                  <div
                    key={x.customerId}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.4)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>
                        {x.customerId} {x.customerName}
                      </div>
                      <span className={`stage-pill ${x.stageInfo.stage}`}>{x.stageInfo.stageText}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {x.stageInfo.blockText}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="summary-card info">
          <div className="summary-card-label">📷 待补照片</div>
          <div className="summary-card-value">{photosPending.length}</div>
          {photosPending.length > 0 && (
            <div className="summary-sublist">
              {photosPending.map((x) => (
                <div key={x}>• {x}</div>
              ))}
            </div>
          )}
        </div>
        <div className="summary-card danger">
          <div className="summary-card-label">👨‍⚕️ 需医生复核</div>
          <div className="summary-card-value">{doctorReviews.length}</div>
          {doctorReviews.length > 0 && (
            <div className="summary-sublist">
              {doctorReviews.map((x) => (
                <div key={x}>• {x}</div>
              ))}
            </div>
          )}
        </div>
        <div className="summary-card danger">
          <div className="summary-card-label">⚠️ 待处理异常</div>
          <div className="summary-card-value">{pendingAbnormals.length}</div>
          {pendingAbnormals.length > 0 && (
            <div className="summary-sublist">
              {pendingAbnormals.map((x) => (
                <div key={x}>• {x}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">📝 提交交班记录</div>
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            本班共 {totalIssues} 项待跟进事项
          </span>
        </div>
        <div className="panel-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">交班人</label>
              <input type="text" className="form-input" value="治疗师-王 (工号 T2024001)" disabled />
            </div>
            <div className="form-group">
              <label className="form-label">接班人<span className="required">*</span></label>
              <select
                className="form-select"
                value={nextOperator}
                onChange={(e) => setNextOperator(e.target.value)}
              >
                <option value="">请选择接班人</option>
                <option value="治疗师-李">治疗师-李 (工号 T2024002)</option>
                <option value="治疗师-张">治疗师-张 (工号 T2024003)</option>
                <option value="治疗师-刘">治疗师-刘 (工号 T2024004)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">交班备注</label>
            <textarea
              className="form-textarea"
              placeholder="其他需要交代的事项，如：设备状态、耗材余量、客户特殊注意事项等"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          {totalIssues > 0 && (
            <div className="alert alert-warning">
              <span>⚠️</span>
              <div>
                请确认已与接班人当面交代上述 {totalIssues} 项待跟进事项，避免信息断层造成医疗风险。
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-lg" onClick={handleHandover} disabled={!canSubmit}>
              📤 确认交班
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">📚 历史交班记录</div>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {handoverLogs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">暂无交班记录</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>交班时间</th>
                  <th>交班人</th>
                  <th>接班人</th>
                  <th>未完成观察</th>
                  <th>待补照片</th>
                  <th>医生复核</th>
                  <th>异常报告</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {handoverLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                    <td>{log.shiftOperator}</td>
                    <td>{log.nextOperator}</td>
                    <td>
                      {log.unfinishedObservations.length > 0 ? (
                        <span className="tag tag-warning">{log.unfinishedObservations.length} 项</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>-</span>
                      )}
                    </td>
                    <td>
                      {log.photosPending.length > 0 ? (
                        <span className="tag tag-info">{log.photosPending.length} 人</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>-</span>
                      )}
                    </td>
                    <td>
                      {log.doctorReviews.length > 0 ? (
                        <span className="tag tag-danger">{log.doctorReviews.length} 人</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>-</span>
                      )}
                    </td>
                    <td>
                      {log.abnormalReports.length > 0 ? (
                        <span className="tag tag-danger">{log.abnormalReports.length} 项</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-light)' }}>{log.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
