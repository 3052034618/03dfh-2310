import { useState } from 'react';
import type { Customer, PostObservationRecord, AbnormalReport, HandoverLog } from '../types';

interface Props {
  customers: Customer[];
  observations: PostObservationRecord[];
  abnormalReports: AbnormalReport[];
  handoverLogs: HandoverLog[];
  addHandoverLog: (log: HandoverLog) => void;
}

export default function HandoverPanel({
  customers,
  observations,
  abnormalReports,
  handoverLogs,
  addHandoverLog,
}: Props) {
  const unfinishedObservations = observations
    .filter((o) => !o.completed)
    .map((o) => {
      const c = customers.find((cu) => cu.id === o.customerId);
      return `${o.customerId} ${c?.name || '未知'}`;
    });

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

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    const log: HandoverLog = {
      id: `HO${String(handoverLogs.length + 1).padStart(3, '0')}`,
      timestamp: `${y}-${m}-${d} ${hh}:${mm}`,
      shiftOperator: '治疗师-王',
      nextOperator: nextOperator.trim(),
      unfinishedObservations,
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
    unfinishedObservations.length +
    photosPending.length +
    doctorReviews.length +
    pendingAbnormals.length;

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
          <div className="summary-card-value">{unfinishedObservations.length}</div>
          {unfinishedObservations.length > 0 && (
            <div className="summary-sublist">
              {unfinishedObservations.map((x) => (
                <div key={x}>• {x}</div>
              ))}
            </div>
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
