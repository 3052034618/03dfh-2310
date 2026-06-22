import { useState } from 'react';
import type { Customer, AbnormalReport, AbnormalType } from '../types';

interface Props {
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: string | null) => void;
  updateCustomerStatus: (id: string, status: Customer['status']) => void;
  abnormalReports: AbnormalReport[];
  addAbnormalReport: (report: AbnormalReport) => void;
}

const ABNORMAL_TYPES: { type: AbnormalType; label: string; icon: string; desc: string }[] = [
  { type: 'blister', label: '水疱形成', icon: '💧', desc: '治疗区域出现水疱' },
  { type: 'severePain', label: '强烈疼痛', icon: '😣', desc: '患者诉剧烈疼痛无法耐受' },
  { type: 'severeRedness', label: '严重红肿', icon: '🔴', desc: '明显红肿超出正常范围' },
  { type: 'burn', label: '烫伤灼伤', icon: '🔥', desc: '疑似表皮烫伤' },
  { type: 'allergy', label: '过敏反应', icon: '🌡️', desc: '瘙痒、皮疹等过敏表现' },
  { type: 'other', label: '其他异常', icon: '❓', desc: '其他需要记录的情况' },
];

const SEVERITY_LEVELS = [
  { key: '轻微', cls: 'mild', desc: '症状轻微，可自行缓解' },
  { key: '中度', cls: 'moderate', desc: '需干预处理' },
  { key: '严重', cls: 'severe', desc: '需紧急就医处理' },
] as const;

export default function AbnormalPanel({
  customers,
  selectedCustomer,
  setSelectedCustomerId,
  updateCustomerStatus,
  abnormalReports,
  addAbnormalReport,
}: Props) {
  const [selectedType, setSelectedType] = useState<AbnormalType | null>(null);
  const [severity, setSeverity] = useState<'轻微' | '中度' | '严重'>('中度');
  const [description, setDescription] = useState('');
  const [handling, setHandling] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const canSubmit = selectedCustomer && selectedType && description.trim() && handling.trim();

  const handleSubmit = () => {
    if (!canSubmit || !selectedCustomer || !selectedType) return;

    const typeInfo = ABNORMAL_TYPES.find((t) => t.type === selectedType)!;
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const report: AbnormalReport = {
      id: `ABN${String(abnormalReports.length + 1).padStart(3, '0')}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      timestamp,
      type: selectedType,
      typeLabel: typeInfo.label,
      severity,
      description: description.trim(),
      handling: handling.trim(),
      reportedBy: '治疗师-王',
      reviewed: false,
    };

    addAbnormalReport(report);
    updateCustomerStatus(selectedCustomer.id, 'abnormal');

    setShowSuccess(true);
    setSelectedType(null);
    setSeverity('中度');
    setDescription('');
    setHandling('');

    setTimeout(() => setShowSuccess(false), 3000);
  };

  const unreviewedReports = abnormalReports.filter((r) => !r.reviewed);
  const reviewedReports = abnormalReports.filter((r) => r.reviewed);

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div>
        <div className="panel" style={{ marginBottom: '20px' }}>
          <div className="panel-header">
            <div className="panel-title">⚠️ 提交异常上报</div>
          </div>
          <div className="panel-body">
            {showSuccess && (
              <div className="alert alert-success">
                <span>✅</span>
                <div>异常报告已提交，已自动通知主治医生，请等待复核。</div>
              </div>
            )}

            <div className="section">
              <div className="section-title">选择客户</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {customers.map((c) => (
                  <label
                    key={c.id}
                    className={`checkbox-item ${selectedCustomer?.id === c.id ? 'checked' : ''}`}
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    <input type="radio" checked={selectedCustomer?.id === c.id} readOnly />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="section">
              <div className="section-title">异常类型</div>
              <div className="abnormal-type-grid">
                {ABNORMAL_TYPES.map((t) => (
                  <div
                    key={t.type}
                    className={`abnormal-type-card ${selectedType === t.type ? 'selected' : ''}`}
                    onClick={() => setSelectedType(t.type)}
                  >
                    <div className="abnormal-type-icon">{t.icon}</div>
                    <div className="abnormal-type-name">{t.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <div className="section-title">严重程度</div>
              <div className="severity-group">
                {SEVERITY_LEVELS.map((s) => (
                  <div
                    key={s.key}
                    className={`severity-btn ${s.cls} ${severity === s.key ? 'selected' : ''}`}
                    onClick={() => setSeverity(s.key)}
                  >
                    {s.key}
                    <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '2px', opacity: 0.8 }}>
                      {s.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">情况描述<span className="required">*</span></label>
              <textarea
                className="form-textarea"
                placeholder="请详细描述异常发生的时间、部位、症状表现、范围大小等"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">已采取措施<span className="required">*</span></label>
              <textarea
                className="form-textarea"
                placeholder="请描述已经采取的处理措施，如：冷敷、停药、外用药物等"
                value={handling}
                onChange={(e) => setHandling(e.target.value)}
              />
            </div>

            <div className="alert alert-warning">
              <span>⚠️</span>
              <div>
                <strong>安全提醒：</strong>中重度异常必须立即通知主治医生到场处理，不得仅上报而延误处置。
                必要时应立即停止治疗并启动应急预案。
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn btn-danger btn-lg" onClick={handleSubmit} disabled={!canSubmit}>
                🚨 提交异常上报
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="panel" style={{ marginBottom: '20px' }}>
          <div className="panel-header">
            <div className="panel-title">🔴 待医生复核 ({unreviewedReports.length})</div>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {unreviewedReports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-text">暂无待复核的异常报告</div>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>客户</th>
                    <th>类型</th>
                    <th>程度</th>
                    <th>上报人</th>
                  </tr>
                </thead>
                <tbody>
                  {unreviewedReports.map((r) => (
                    <tr key={r.id}>
                      <td>{r.timestamp}</td>
                      <td style={{ fontWeight: 600 }}>{r.customerName}</td>
                      <td>
                        <span className="tag tag-danger">{r.typeLabel}</span>
                      </td>
                      <td>
                        <span className={`tag ${r.severity === '严重' ? 'tag-danger' : r.severity === '中度' ? 'tag-warning' : 'tag-primary'}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td>{r.reportedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {unreviewedReports.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {unreviewedReports.map((r) => (
              <div key={r.id} className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <span className={`tag ${r.severity === '严重' ? 'tag-danger' : 'tag-warning'}`}>{r.severity}</span>
                    <span style={{ marginLeft: '8px' }}>{r.customerName} - {r.typeLabel}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{r.timestamp}</span>
                </div>
                <div className="panel-body">
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>情况描述</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.7 }}>{r.description}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>处理措施</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--success)' }}>{r.handling}</div>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-light)' }}>
                    上报人：{r.reportedBy}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {reviewedReports.length > 0 && (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">✅ 已处理 ({reviewedReports.length})</div>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>客户</th>
                    <th>类型</th>
                    <th>复核人</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewedReports.map((r) => (
                    <tr key={r.id}>
                      <td>{r.timestamp}</td>
                      <td>{r.customerName}</td>
                      <td>{r.typeLabel}</td>
                      <td>{r.reviewer || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
