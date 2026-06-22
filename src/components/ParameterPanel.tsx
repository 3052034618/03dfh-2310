import { useState, useEffect } from 'react';
import type { Customer, ParameterRecord } from '../types';

interface Props {
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: string | null) => void;
  updateCustomerStatus: (id: string, status: Customer['status']) => void;
  parameters: ParameterRecord[];
  addParameter: (record: Omit<ParameterRecord, 'version' | 'createdAt'>) => void;
  updateCustomerPlan: (customerId: string, plan: string, author: string) => void;
}

const DEVICE_MODELS = [
  'DPL 精准嫩肤仪 Pro',
  'IPL Queen 光子治疗仪',
  'M22 王者之冠',
  'BB光 智能光子平台',
  'Elos Plus 光电协同',
];

const TREATMENT_HEADS = [
  '500-600nm 嫩肤治疗头',
  '550-650nm 血管治疗头',
  '570-950nm 祛斑治疗头',
  '590-950nm 痤疮治疗头',
  '650-950nm 脱毛治疗头',
];

const ENERGY_OPTIONS = ['10', '12', '14', '15', '16', '17', '18', '20', '22', '24'];
const PULSE_WIDTH_OPTIONS = ['5', '8', '10', '12', '15', '18', '20', '25', '30'];
const SPOT_SIZE_OPTIONS = ['10×40mm', '15×50mm', '15×35mm', '8×15mm'];

function formatDateTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function ParameterPanel({
  customers,
  selectedCustomer,
  setSelectedCustomerId,
  updateCustomerStatus,
  parameters,
  addParameter,
  updateCustomerPlan,
}: Props) {
  const availableCustomers = customers.filter((c) =>
    ['checking', 'treating', 'observing'].includes(c.status) ||
    parameters.some((p) => p.customerId === c.id)
  );

  const customerVersions = selectedCustomer
    ? parameters
        .filter((p) => p.customerId === selectedCustomer.id)
        .sort((a, b) => b.version - a.version)
    : [];
  const latestParam = customerVersions[0];

  const [form, setForm] = useState({
    deviceModel: DEVICE_MODELS[0],
    treatmentHead: TREATMENT_HEADS[0],
    energy: '16',
    pulseWidth: '12',
    spotSize: '15×50mm',
    passes: 3,
    remark: '',
  });

  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planAuthor, setPlanAuthor] = useState('');
  const [planContent, setPlanContent] = useState('');
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (latestParam) {
      setForm({
        deviceModel: latestParam.deviceModel,
        treatmentHead: latestParam.treatmentHead,
        energy: latestParam.energy.replace('J/cm²', ''),
        pulseWidth: latestParam.pulseWidth.replace('ms', ''),
        spotSize: latestParam.spotSize,
        passes: latestParam.passes,
        remark: latestParam.remark || '',
      });
      setSavedAt(latestParam.createdAt);
    } else {
      setForm({
        deviceModel: DEVICE_MODELS[0],
        treatmentHead: TREATMENT_HEADS[0],
        energy: '16',
        pulseWidth: '12',
        spotSize: '15×50mm',
        passes: 3,
        remark: '',
      });
      setSavedAt(null);
    }
    setExpandedVersion(null);
  }, [selectedCustomer?.id]);

  useEffect(() => {
    if (selectedCustomer && !selectedCustomer.treatmentPlan) {
      setPlanAuthor(selectedCustomer.doctor);
      setPlanContent('');
    }
  }, [selectedCustomer?.id]);

  const hasPlan = !!selectedCustomer?.treatmentPlan;
  const canSubmit = hasPlan && form.energy && form.pulseWidth && form.passes > 0;

  const handleSubmit = () => {
    if (!selectedCustomer || !canSubmit) return;

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    addParameter({
      customerId: selectedCustomer.id,
      timestamp,
      deviceModel: form.deviceModel,
      treatmentHead: form.treatmentHead,
      energy: `${form.energy}J/cm²`,
      pulseWidth: `${form.pulseWidth}ms`,
      spotSize: form.spotSize,
      passes: form.passes,
      operator: '治疗师-王',
      remark: form.remark || undefined,
    });
    updateCustomerStatus(selectedCustomer.id, 'treating');
    setSavedAt(Date.now());
  };

  const handleSavePlan = () => {
    if (!selectedCustomer || !planContent.trim() || !planAuthor.trim()) return;
    updateCustomerPlan(selectedCustomer.id, planContent.trim(), planAuthor.trim());
    setShowPlanModal(false);
  };

  const renderDiff = (cur: ParameterRecord) => {
    const prev = customerVersions.find((v) => v.version === cur.version - 1);
    if (!prev) {
      return (
        <div>
          <div className="diff-row"><span className="diff-label">仪器型号</span><span className="diff-value">{cur.deviceModel}</span></div>
          <div className="diff-row"><span className="diff-label">治疗头</span><span className="diff-value">{cur.treatmentHead}</span></div>
          <div className="diff-row"><span className="diff-label">能量</span><span className="diff-value">{cur.energy}</span></div>
          <div className="diff-row"><span className="diff-label">脉宽</span><span className="diff-value">{cur.pulseWidth}</span></div>
          <div className="diff-row"><span className="diff-label">光斑大小</span><span className="diff-value">{cur.spotSize}</span></div>
          <div className="diff-row"><span className="diff-label">通过次数</span><span className="diff-value">{cur.passes} 遍</span></div>
          <div className="diff-row"><span className="diff-label">备注</span><span className="diff-value">{cur.remark || '-'}</span></div>
        </div>
      );
    }
    const fields: { label: string; key: keyof ParameterRecord; format?: (v: any) => string }[] = [
      { label: '仪器型号', key: 'deviceModel' },
      { label: '治疗头', key: 'treatmentHead' },
      { label: '能量', key: 'energy' },
      { label: '脉宽', key: 'pulseWidth' },
      { label: '光斑大小', key: 'spotSize' },
      { label: '通过次数', key: 'passes', format: (v) => `${v} 遍` },
      { label: '备注', key: 'remark', format: (v) => v || '-' },
    ];
    const changes: JSX.Element[] = [];
    fields.forEach((f, idx) => {
      const oldV = prev[f.key];
      const newV = cur[f.key];
      const oldStr = f.format ? f.format(oldV) : String(oldV);
      const newStr = f.format ? f.format(newV) : String(newV);
      if (oldStr !== newStr) {
        changes.push(
          <div key={idx} className="diff-change">
            <div className="diff-arrow">→</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{f.label}</div>
              <div className="diff-old">{oldStr}</div>
              <div className="diff-new">{newStr}</div>
            </div>
          </div>
        );
      }
    });
    return changes.length === 0
      ? <div style={{ color: 'var(--text-light)' }}>与上一版无字段差异</div>
      : <>{changes}</>;
  };

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: '20px' }}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">选择客户</div>
          </div>
          <div className="panel-body" style={{ padding: '12px' }}>
            {availableCustomers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⚙️</div>
                <div className="empty-state-text">暂无可记录客户</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableCustomers.map((c) => {
                  const count = parameters.filter((p) => p.customerId === c.id).length;
                  return (
                    <div
                      key={c.id}
                      className={`queue-card ${selectedCustomer?.id === c.id ? 'selected' : ''}`}
                      style={{ padding: '12px 14px' }}
                      onClick={() => setSelectedCustomerId(c.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {c.name}
                            {!c.treatmentPlan && <span className="tag tag-danger" style={{ fontSize: '10px' }}>缺方案</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{c.appointment}</div>
                        </div>
                        {count > 0 && <span className="tag tag-success">v{count}</span>}
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
                  <div className="empty-state-text">请从左侧选择客户开始参数记录</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {!selectedCustomer.treatmentPlan && (
                <div className="alert alert-danger" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px' }}>🚫</span>
                  <div style={{ flex: 1 }}>
                    <strong>该客户尚未关联医生疗程方案！</strong>
                    <div style={{ marginTop: '4px' }}>请立即联系 <strong>{selectedCustomer.doctor}</strong> 开具并补录方案。<strong>补齐前禁止确认参数开始治疗。</strong></div>
                    <div style={{ marginTop: '10px' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => setShowPlanModal(true)}>
                        ➕ 补录疗程方案
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedCustomer.treatmentPlan && (
                <div className="plan-reminder">
                  <div className="plan-reminder-title">📋 医生开具的疗程方案（请严格对照执行）</div>
                  <div className="plan-reminder-content">{selectedCustomer.treatmentPlan}</div>
                  {selectedCustomer.planAuthor && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-light)' }}>
                      方案由 {selectedCustomer.planAuthor} 开具{selectedCustomer.planUpdatedAt ? ` · ${formatDateTime(selectedCustomer.planUpdatedAt)}` : ''}
                    </div>
                  )}
                </div>
              )}

              <div className="panel" style={{ marginBottom: '20px' }}>
                <div className="panel-header">
                  <div className="panel-title">
                    治疗参数记录 — <span style={{ color: 'var(--primary-light)' }}>{selectedCustomer.name}</span>
                  </div>
                  {savedAt && (
                    <span className="tag tag-success">v{customerVersions[0]?.version ?? 1} · 最近保存 {formatDateTime(savedAt)}</span>
                  )}
                </div>
                <div className="panel-body">
                  <div className="section">
                    <div className="section-title">设备信息</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">仪器型号<span className="required">*</span></label>
                        <select
                          className="form-select"
                          value={form.deviceModel}
                          onChange={(e) => setForm({ ...form, deviceModel: e.target.value })}
                        >
                          {DEVICE_MODELS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">治疗头<span className="required">*</span></label>
                        <select
                          className="form-select"
                          value={form.treatmentHead}
                          onChange={(e) => setForm({ ...form, treatmentHead: e.target.value })}
                        >
                          {TREATMENT_HEADS.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-title">治疗参数</div>
                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label">能量 (J/cm²)<span className="required">*</span></label>
                        <div className="checkbox-group">
                          {ENERGY_OPTIONS.map((v) => (
                            <label
                              key={v}
                              className={`checkbox-item ${form.energy === v ? 'checked' : ''}`}
                              onClick={() => setForm({ ...form, energy: v })}
                            >
                              <input type="radio" checked={form.energy === v} readOnly />
                              {v}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">脉宽 (ms)<span className="required">*</span></label>
                        <div className="checkbox-group">
                          {PULSE_WIDTH_OPTIONS.map((v) => (
                            <label
                              key={v}
                              className={`checkbox-item ${form.pulseWidth === v ? 'checked' : ''}`}
                              onClick={() => setForm({ ...form, pulseWidth: v })}
                            >
                              <input type="radio" checked={form.pulseWidth === v} readOnly />
                              {v}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">光斑大小<span className="required">*</span></label>
                        <div className="checkbox-group">
                          {SPOT_SIZE_OPTIONS.map((v) => (
                            <label
                              key={v}
                              className={`checkbox-item ${form.spotSize === v ? 'checked' : ''}`}
                              onClick={() => setForm({ ...form, spotSize: v })}
                            >
                              <input type="radio" checked={form.spotSize === v} readOnly />
                              {v}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-title">治疗遍数 & 备注</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">通过次数<span className="required">*</span></label>
                        <div className="checkbox-group">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <label
                              key={n}
                              className={`checkbox-item ${form.passes === n ? 'checked' : ''}`}
                              onClick={() => setForm({ ...form, passes: n })}
                            >
                              <input type="radio" checked={form.passes === n} readOnly />
                              {n} 遍
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">参数调整备注</label>
                        <textarea
                          className="form-textarea"
                          placeholder="如某区域能量调整、冷却方式变化等特殊说明"
                          value={form.remark}
                          onChange={(e) => setForm({ ...form, remark: e.target.value })}
                          style={{ minHeight: '70px' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-info">
                    <span>📌</span>
                    <div>
                      每次保存都会生成一个带时间戳和版本号的永久记录（不覆盖历史），可在下方查看每一次变更，用于参数追溯和安全核查。
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        setForm({
                          deviceModel: DEVICE_MODELS[0],
                          treatmentHead: TREATMENT_HEADS[0],
                          energy: '16',
                          pulseWidth: '12',
                          spotSize: '15×50mm',
                          passes: 3,
                          remark: '',
                        })
                      }
                    >
                      重置
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!canSubmit}>
                      {!hasPlan
                        ? '🚫 请先补录医生疗程方案'
                        : customerVersions.length > 0
                        ? '� 保存并追加为新版本'
                        : '�💾 确认参数并开始治疗'}
                    </button>
                  </div>
                </div>
              </div>

              {customerVersions.length > 0 && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">📜 参数历史版本（共 {customerVersions.length} 版）</div>
                  </div>
                  <div className="panel-body">
                    <div className="history-list">
                      {customerVersions.map((v) => {
                        const isLatest = v === customerVersions[0];
                        const isOpen = expandedVersion === v.version;
                        return (
                          <div key={v.version} className="history-card">
                            <div
                              className="history-card-header"
                              onClick={() => setExpandedVersion(isOpen ? null : v.version)}
                            >
                              <div className="history-card-title">
                                <span className={`tag ${isLatest ? 'tag-success' : 'tag-default'}`}>
                                  版本 v{v.version} {isLatest && '（最新）'}
                                </span>
                                <span>{formatDateTime(v.createdAt)}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                {v.operator} {isOpen ? '▲' : '▼'}
                              </div>
                            </div>
                            {isOpen && (
                              <div className="history-card-body">
                                {renderDiff(v)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showPlanModal && selectedCustomer && (
        <div className="modal-mask" onClick={() => setShowPlanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📋 补录疗程方案 — {selectedCustomer.name}</div>
              <button className="modal-close" onClick={() => setShowPlanModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">授权开具人<span className="required">*</span></label>
                <select
                  className="form-select"
                  value={planAuthor}
                  onChange={(e) => setPlanAuthor(e.target.value)}
                >
                  <option value="">请选择授权人</option>
                  <option value={selectedCustomer.doctor}>{selectedCustomer.doctor}（主治）</option>
                  <option value="李医生">李医生</option>
                  <option value="陈医生">陈医生</option>
                  <option value="张主任">张主任（授权）</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">疗程方案内容<span className="required">*</span></label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '140px' }}
                  placeholder="例如：全脸 DPL 嫩肤，能量 15-18J/cm²，脉宽 10-15ms，3 遍；双颊加强能量不超过 20J/cm²。"
                  value={planContent}
                  onChange={(e) => setPlanContent(e.target.value)}
                />
                <div className="form-hint">
                  此方案将作为治疗师操作的唯一依据，请完整填写：治疗区域、能量范围、脉宽范围、治疗遍数、特殊部位注意事项等。
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPlanModal(false)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleSavePlan}
                disabled={!planAuthor.trim() || !planContent.trim()}
              >
                ✅ 确认补录方案
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
