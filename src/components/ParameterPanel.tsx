import { useState, useEffect } from 'react';
import type { Customer, ParameterRecord } from '../types';

interface Props {
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: string | null) => void;
  updateCustomerStatus: (id: string, status: Customer['status']) => void;
  parameters: ParameterRecord[];
  addParameter: (record: ParameterRecord) => void;
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

export default function ParameterPanel({
  customers,
  selectedCustomer,
  setSelectedCustomerId,
  updateCustomerStatus,
  parameters,
  addParameter,
}: Props) {
  const availableCustomers = customers.filter((c) =>
    ['checking', 'treating', 'observing'].includes(c.status)
  );

  const existingParam = selectedCustomer
    ? parameters.find((p) => p.customerId === selectedCustomer.id)
    : null;

  const [form, setForm] = useState({
    deviceModel: DEVICE_MODELS[0],
    treatmentHead: TREATMENT_HEADS[0],
    energy: '16',
    pulseWidth: '12',
    spotSize: '15×50mm',
    passes: 3,
    remark: '',
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingParam) {
      setForm({
        deviceModel: existingParam.deviceModel,
        treatmentHead: existingParam.treatmentHead,
        energy: existingParam.energy.replace('J/cm²', ''),
        pulseWidth: existingParam.pulseWidth.replace('ms', ''),
        spotSize: existingParam.spotSize,
        passes: existingParam.passes,
        remark: existingParam.remark || '',
      });
      setSaved(true);
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
      setSaved(false);
    }
  }, [selectedCustomer?.id, existingParam]);

  const canSubmit = form.energy && form.pulseWidth && form.passes > 0;

  const handleSubmit = () => {
    if (!selectedCustomer || !canSubmit) return;

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const record: ParameterRecord = {
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
    };

    addParameter(record);
    updateCustomerStatus(selectedCustomer.id, 'treating');
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
              <div className="empty-state-icon">⚙️</div>
              <div className="empty-state-text">暂无可记录客户</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableCustomers.map((c) => {
                const done = parameters.some((p) => p.customerId === c.id);
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
                      {done && <span className="tag tag-success">已记录</span>}
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
            {selectedCustomer.treatmentPlan && (
              <div className="plan-reminder">
                <div className="plan-reminder-title">📋 医生开具的疗程方案（请严格对照执行）</div>
                <div className="plan-reminder-content">{selectedCustomer.treatmentPlan}</div>
              </div>
            )}

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  治疗参数记录 — <span style={{ color: 'var(--primary-light)' }}>{selectedCustomer.name}</span>
                </div>
                {saved && <span className="tag tag-success">已保存</span>}
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
                    治疗参数将永久留存于客户档案，用于疗效追溯和安全核查，请确保数据准确无误。
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
                    💾 确认参数并开始治疗
                  </button>
                </div>
              </div>
            </div>

            {saved && existingParam && (
              <div className="panel" style={{ marginTop: '20px' }}>
                <div className="panel-header">
                  <div className="panel-title">📜 已保存记录</div>
                </div>
                <div className="panel-body">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>仪器</th>
                        <th>治疗头</th>
                        <th>能量</th>
                        <th>脉宽</th>
                        <th>光斑</th>
                        <th>遍数</th>
                        <th>操作人</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{existingParam.timestamp}</td>
                        <td>{existingParam.deviceModel}</td>
                        <td>{existingParam.treatmentHead}</td>
                        <td>{existingParam.energy}</td>
                        <td>{existingParam.pulseWidth}</td>
                        <td>{existingParam.spotSize}</td>
                        <td>{existingParam.passes}</td>
                        <td>{existingParam.operator}</td>
                        <td>{existingParam.remark || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
