import { useState, useEffect } from 'react';
import type { Customer, PreCheckRecord } from '../types';

interface Props {
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: string | null) => void;
  updateCustomerStatus: (id: string, status: Customer['status']) => void;
  preChecks: PreCheckRecord[];
  addPreCheck: (record: Omit<PreCheckRecord, 'version' | 'createdAt'>) => void;
  updateCustomerPlan: (customerId: string, plan: string, author: string) => void;
}

const TREATMENT_SITES = ['额头', '左颊', '右颊', '鼻部', '鼻翼', '下颌', '口周', '颈部'];

const CONTRAINDICATIONS = [
  '妊娠期',
  '哺乳期',
  '光敏感史',
  '近期口服异维A酸',
  '活动性疱疹',
  '皮肤破损感染',
  '瘢痕疙瘩史',
  '凝血功能障碍',
  '免疫抑制剂使用',
  '糖尿病',
];

const SUN_EXPOSURE_OPTIONS = ['无', '轻度', '中度', '重度'] as const;

function formatDateTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function PreCheckPanel({
  customers,
  selectedCustomer,
  setSelectedCustomerId,
  updateCustomerStatus,
  preChecks,
  addPreCheck,
  updateCustomerPlan,
}: Props) {
  const availableCustomers = customers.filter((c) =>
    ['waiting', 'checking'].includes(c.status) || preChecks.some((p) => p.customerId === c.id)
  );

  const customerVersions = selectedCustomer
    ? preChecks
        .filter((p) => p.customerId === selectedCustomer.id)
        .sort((a, b) => b.version - a.version)
    : [];
  const latestCheck = customerVersions[0];

  const [form, setForm] = useState({
    nameVerified: false,
    treatmentSites: [] as string[],
    contraindications: [] as string[],
    recentSunExposure: '无' as PreCheckRecord['recentSunExposure'],
    medicationUse: '',
    planReviewed: false,
  });

  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planAuthor, setPlanAuthor] = useState('');
  const [planContent, setPlanContent] = useState('');
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (latestCheck) {
      setForm({
        nameVerified: latestCheck.nameVerified,
        treatmentSites: latestCheck.treatmentSites,
        contraindications: latestCheck.contraindications,
        recentSunExposure: latestCheck.recentSunExposure,
        medicationUse: latestCheck.medicationUse,
        planReviewed: latestCheck.planReviewed,
      });
      setSavedAt(latestCheck.createdAt);
    } else {
      setForm({
        nameVerified: false,
        treatmentSites: [],
        contraindications: [],
        recentSunExposure: '无',
        medicationUse: '',
        planReviewed: false,
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

  const toggleArray = (arr: string[], value: string) => {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  };

  const hasPlan = !!selectedCustomer?.treatmentPlan;

  const canSubmit =
    hasPlan &&
    form.nameVerified &&
    form.treatmentSites.length > 0 &&
    form.planReviewed;

  const handleSubmit = () => {
    if (!selectedCustomer || !canSubmit) return;

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    addPreCheck({
      customerId: selectedCustomer.id,
      timestamp,
      nameVerified: form.nameVerified,
      treatmentSites: form.treatmentSites,
      contraindications: form.contraindications,
      recentSunExposure: form.recentSunExposure,
      medicationUse: form.medicationUse || '无特殊用药',
      planReviewed: form.planReviewed,
      operator: '治疗师-王',
    });
    updateCustomerStatus(selectedCustomer.id, 'checking');
    setSavedAt(Date.now());
  };

  const handleSavePlan = () => {
    if (!selectedCustomer || !planContent.trim() || !planAuthor.trim()) return;
    updateCustomerPlan(selectedCustomer.id, planContent.trim(), planAuthor.trim());
    setShowPlanModal(false);
  };

  const renderDiff = (cur: PreCheckRecord) => {
    const prev = customerVersions.find((v) => v.version === cur.version - 1);
    if (!prev) {
      return (
        <div>
          <div className="diff-row"><span className="diff-label">身份核对</span><span className="diff-value">{cur.nameVerified ? '✅ 已核对' : '❌ 未核对'}</span></div>
          <div className="diff-row"><span className="diff-label">治疗部位</span><span className="diff-value">{cur.treatmentSites.join('、') || '-'}</span></div>
          <div className="diff-row"><span className="diff-label">禁忌症</span><span className="diff-value">{cur.contraindications.join('、') || '无'}</span></div>
          <div className="diff-row"><span className="diff-label">日晒情况</span><span className="diff-value">{cur.recentSunExposure}</span></div>
          <div className="diff-row"><span className="diff-label">药物使用</span><span className="diff-value">{cur.medicationUse || '-'}</span></div>
          <div className="diff-row"><span className="diff-label">方案确认</span><span className="diff-value">{cur.planReviewed ? '✅ 已查看' : '❌ 未确认'}</span></div>
        </div>
      );
    }
    const fields: { label: string; key: keyof PreCheckRecord; format?: (v: any) => string }[] = [
      { label: '身份核对', key: 'nameVerified', format: (v) => v ? '✅ 已核对' : '❌ 未核对' },
      { label: '治疗部位', key: 'treatmentSites', format: (v: string[]) => v.join('、') || '-' },
      { label: '禁忌症', key: 'contraindications', format: (v: string[]) => v.join('、') || '无' },
      { label: '日晒情况', key: 'recentSunExposure' },
      { label: '药物使用', key: 'medicationUse', format: (v) => v || '-' },
      { label: '方案确认', key: 'planReviewed', format: (v) => v ? '✅ 已查看' : '❌ 未确认' },
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
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-text">暂无需核查客户</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableCustomers.map((c) => {
                  const count = preChecks.filter((p) => p.customerId === c.id).length;
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
                  <div className="empty-state-text">请从左侧选择客户开始术前核查</div>
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
                    <div style={{ marginTop: '4px' }}>请立即联系 <strong>{selectedCustomer.doctor}</strong> 开具并补录方案。<strong>补齐前禁止保存核查记录。</strong></div>
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
                  <div className="plan-reminder-title">⚠️ 请务必查看医生开具的疗程方案，严禁凭记忆操作</div>
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
                    术前核查 — <span style={{ color: 'var(--primary-light)' }}>{selectedCustomer.name}</span>
                  </div>
                  {savedAt && (
                    <span className="tag tag-success">v{customerVersions[0]?.version ?? 1} · 最近保存 {formatDateTime(savedAt)}</span>
                  )}
                </div>
                <div className="panel-body">
                  <div className="section">
                    <div className="section-title">身份确认</div>
                    <label
                      className={`checkbox-item ${form.nameVerified ? 'checked' : ''}`}
                      style={{ maxWidth: 'none' }}
                      onClick={() => setForm({ ...form, nameVerified: !form.nameVerified })}
                    >
                      <input type="checkbox" checked={form.nameVerified} readOnly />
                      <span style={{ fontWeight: form.nameVerified ? 600 : 400 }}>
                        ✅ 已当面核对患者姓名、出生日期，与就诊卡一致
                      </span>
                    </label>
                  </div>

                  <div className="section">
                    <div className="section-title">治疗部位<span className="required">*</span></div>
                    <div className="checkbox-group">
                      {TREATMENT_SITES.map((site) => (
                        <label
                          key={site}
                          className={`checkbox-item ${form.treatmentSites.includes(site) ? 'checked' : ''}`}
                          onClick={() =>
                            setForm({ ...form, treatmentSites: toggleArray(form.treatmentSites, site) })
                          }
                        >
                          <input
                            type="checkbox"
                            checked={form.treatmentSites.includes(site)}
                            readOnly
                          />
                          {site}
                        </label>
                      ))}
                    </div>
                    <div className="form-hint">请勾选所有计划治疗的区域</div>
                  </div>

                  <div className="section">
                    <div className="section-title">禁忌症筛查</div>
                    <div className="form-hint" style={{ marginBottom: '10px' }}>
                      请勾选患者存在的禁忌症（如无则不勾选）
                    </div>
                    <div className="checkbox-group">
                      {CONTRAINDICATIONS.map((c) => (
                        <label
                          key={c}
                          className={`checkbox-item ${form.contraindications.includes(c) ? 'checked' : ''}`}
                          onClick={() =>
                            setForm({ ...form, contraindications: toggleArray(form.contraindications, c) })
                          }
                        >
                          <input type="checkbox" checked={form.contraindications.includes(c)} readOnly />
                          {c}
                        </label>
                      ))}
                    </div>
                    {form.contraindications.length > 0 && (
                      <div className="alert alert-danger" style={{ marginTop: '14px' }}>
                        <span>⚠️</span>
                        <div>
                          患者存在禁忌症：<strong>{form.contraindications.join('、')}</strong>
                          ，请联系医生确认是否继续治疗。
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">近期日晒情况<span className="required">*</span></label>
                      <div className="checkbox-group">
                        {SUN_EXPOSURE_OPTIONS.map((opt) => (
                          <label
                            key={opt}
                            className={`checkbox-item ${form.recentSunExposure === opt ? 'checked' : ''}`}
                            onClick={() => setForm({ ...form, recentSunExposure: opt })}
                          >
                            <input type="radio" checked={form.recentSunExposure === opt} readOnly />
                            {opt}
                          </label>
                        ))}
                      </div>
                      <div className="form-hint">近2周内是否有暴晒、海边、高原旅行等</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">近期药物使用</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="如：口服异维A酸、阿司匹林、光敏性药物等，无则填「无」"
                        value={form.medicationUse}
                        onChange={(e) => setForm({ ...form, medicationUse: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-title">方案确认</div>
                    <label
                      className={`checkbox-item ${form.planReviewed ? 'checked' : ''}`}
                      style={{
                        maxWidth: 'none',
                        opacity: hasPlan ? 1 : 0.5,
                        cursor: hasPlan ? 'pointer' : 'not-allowed',
                      }}
                      onClick={() => {
                        if (!hasPlan) return;
                        setForm({ ...form, planReviewed: !form.planReviewed });
                      }}
                    >
                      <input type="checkbox" checked={form.planReviewed} readOnly />
                      <span style={{ fontWeight: form.planReviewed ? 600 : 400 }}>
                        📋 已查看并确认医生开具的疗程方案，能量、脉宽、治疗次数与方案一致
                      </span>
                      {!hasPlan && (
                        <span className="tag tag-danger" style={{ marginLeft: 'auto' }}>
                          缺少方案，无法确认
                        </span>
                      )}
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        setForm({
                          nameVerified: false,
                          treatmentSites: [],
                          contraindications: [],
                          recentSunExposure: '无',
                          medicationUse: '',
                          planReviewed: false,
                        })
                      }
                    >
                      重置
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!canSubmit}>
                      {!hasPlan
                        ? '🚫 请先补录医生疗程方案'
                        : !form.nameVerified
                        ? '请完成身份确认'
                        : form.treatmentSites.length === 0
                        ? '请选择治疗部位'
                        : !form.planReviewed
                        ? '请确认已查看疗程方案'
                        : customerVersions.length > 0
                        ? '💾 保存并更新为新版本'
                        : '💾 保存核查记录'}
                    </button>
                  </div>
                </div>
              </div>

              {customerVersions.length > 0 && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">📜 核查历史版本（共 {customerVersions.length} 版）</div>
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
