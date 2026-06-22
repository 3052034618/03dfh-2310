import { useState, useEffect } from 'react';
import type { Customer, PreCheckRecord } from '../types';

interface Props {
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: string | null) => void;
  updateCustomerStatus: (id: string, status: Customer['status']) => void;
  preChecks: PreCheckRecord[];
  addPreCheck: (record: PreCheckRecord) => void;
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

export default function PreCheckPanel({
  customers,
  selectedCustomer,
  setSelectedCustomerId,
  updateCustomerStatus,
  preChecks,
  addPreCheck,
}: Props) {
  const availableCustomers = customers.filter((c) => ['waiting', 'checking'].includes(c.status));

  const existingCheck = selectedCustomer
    ? preChecks.find((p) => p.customerId === selectedCustomer.id)
    : null;

  const [form, setForm] = useState({
    nameVerified: false,
    treatmentSites: [] as string[],
    contraindications: [] as string[],
    recentSunExposure: '无' as PreCheckRecord['recentSunExposure'],
    medicationUse: '',
    planReviewed: false,
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingCheck) {
      setForm({
        nameVerified: existingCheck.nameVerified,
        treatmentSites: existingCheck.treatmentSites,
        contraindications: existingCheck.contraindications,
        recentSunExposure: existingCheck.recentSunExposure,
        medicationUse: existingCheck.medicationUse,
        planReviewed: existingCheck.planReviewed,
      });
      setSaved(true);
    } else {
      setForm({
        nameVerified: false,
        treatmentSites: [],
        contraindications: [],
        recentSunExposure: '无',
        medicationUse: '',
        planReviewed: false,
      });
      setSaved(false);
    }
  }, [selectedCustomer?.id, existingCheck]);

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

    const record: PreCheckRecord = {
      customerId: selectedCustomer.id,
      timestamp,
      nameVerified: form.nameVerified,
      treatmentSites: form.treatmentSites,
      contraindications: form.contraindications,
      recentSunExposure: form.recentSunExposure,
      medicationUse: form.medicationUse || '无特殊用药',
      planReviewed: form.planReviewed,
      operator: '治疗师-王',
    };

    addPreCheck(record);
    updateCustomerStatus(selectedCustomer.id, 'checking');
    setSaved(true);
  };

  return (
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
                const done = preChecks.some((p) => p.customerId === c.id);
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
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{c.appointment}</div>
                      </div>
                      {done && <span className="tag tag-success">已核查</span>}
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
              <div className="alert alert-danger">
                <span>🚫</span>
                <div>
                  <strong>该客户尚未关联医生疗程方案！</strong>
                  <div style={{ marginTop: '4px' }}>请立即联系 <strong>{selectedCustomer.doctor}</strong> 开具并补录方案，<strong>补齐前禁止进入治疗流程</strong>。</div>
                </div>
              </div>
            )}

            {selectedCustomer.treatmentPlan && (
              <div className="plan-reminder">
                <div className="plan-reminder-title">⚠️ 请务必查看医生开具的疗程方案，严禁凭记忆操作</div>
                <div className="plan-reminder-content">{selectedCustomer.treatmentPlan}</div>
              </div>
            )}

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  术前核查 — <span style={{ color: 'var(--primary-light)' }}>{selectedCustomer.name}</span>
                </div>
                {saved && <span className="tag tag-success">已保存</span>}
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
                      : '💾 保存核查记录'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
