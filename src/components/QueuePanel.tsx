import type { Customer } from '../types';

interface Props {
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: string | null) => void;
  updateCustomerStatus: (id: string, status: Customer['status']) => void;
}

const statusMap: Record<Customer['status'], { label: string; cls: string }> = {
  waiting: { label: '等候中', cls: 'tag-default' },
  checking: { label: '术前核查', cls: 'tag-primary' },
  treating: { label: '治疗中', cls: 'tag-warning' },
  observing: { label: '术后观察', cls: 'tag-info' },
  completed: { label: '已完成', cls: 'tag-success' },
  abnormal: { label: '异常', cls: 'tag-danger' },
};

export default function QueuePanel({ customers, selectedCustomer, setSelectedCustomerId }: Props) {
  const waitingList = customers.filter((c) => c.status === 'waiting');
  const inProgressList = customers.filter((c) => ['checking', 'treating', 'observing'].includes(c.status));
  const completedList = customers.filter((c) => c.status === 'completed' || c.status === 'abnormal');

  return (
    <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 340px', gap: '20px' }}>
      <div>
        <div className="section">
          <div className="section-title">进行中 ({inProgressList.length})</div>
          <div className="queue-list">
            {inProgressList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💤</div>
                <div className="empty-state-text">暂无进行中的客户</div>
              </div>
            ) : (
              inProgressList.map((c) => (
                <QueueCard
                  key={c.id}
                  customer={c}
                  selected={selectedCustomer?.id === c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-title">等候队列 ({waitingList.length})</div>
          <div className="queue-list">
            {waitingList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-text">等候队列为空</div>
              </div>
            ) : (
              waitingList.map((c) => (
                <QueueCard
                  key={c.id}
                  customer={c}
                  selected={selectedCustomer?.id === c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-title">已完成 ({completedList.length})</div>
          <div className="queue-list">
            {completedList.map((c) => (
              <QueueCard
                key={c.id}
                customer={c}
                selected={selectedCustomer?.id === c.id}
                onClick={() => setSelectedCustomerId(c.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        {selectedCustomer ? (
          <CustomerDetail customer={selectedCustomer} />
        ) : (
          <div className="panel">
            <div className="panel-body">
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <div className="empty-state-text">请从左侧选择客户查看详情</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QueueCard({
  customer,
  selected,
  onClick,
}: {
  customer: Customer;
  selected: boolean;
  onClick: () => void;
}) {
  const status = statusMap[customer.status];
  return (
    <div className={`queue-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="queue-card-header">
        <div>
          <div className="queue-card-name">{customer.name}</div>
          <div className="queue-card-meta">
            {customer.id} · {customer.gender} · {customer.age}岁 · {customer.phone}
          </div>
        </div>
        <span className={`tag ${status.cls}`}>{status.label}</span>
      </div>
      <div className="queue-card-appointment">📌 {customer.appointment}</div>
      <div className="queue-card-footer">
        <span className="queue-card-time">🕐 签到 {customer.checkInTime} · 👨‍⚕️ {customer.doctor}</span>
        <div className="queue-card-flags">
          {customer.photoRequired && <span className="flag">需拍照</span>}
          {customer.needsDoctorReview && <span className="flag">需医生复核</span>}
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({ customer }: { customer: Customer }) {
  const status = statusMap[customer.status];
  return (
    <div className="customer-detail">
      <div className="customer-detail-header">
        <div className="name">{customer.name}</div>
        <div className="info">
          {customer.gender} · {customer.age}岁 · {customer.phone}
        </div>
      </div>
      <div className="customer-detail-body">
        <div className="info-list">
          <div className="info-item">
            <span className="label">客户编号</span>
            <span className="value">{customer.id}</span>
          </div>
          <div className="info-item">
            <span className="label">当前状态</span>
            <span className={`tag ${status.cls}`}>{status.label}</span>
          </div>
          <div className="info-item">
            <span className="label">预约项目</span>
            <span className="value">{customer.appointment}</span>
          </div>
          <div className="info-item">
            <span className="label">主治医生</span>
            <span className="value">{customer.doctor}</span>
          </div>
          <div className="info-item">
            <span className="label">签到时间</span>
            <span className="value">{customer.checkInTime}</span>
          </div>
        </div>

        {customer.treatmentPlan && (
          <div style={{ marginTop: '20px' }}>
            <div className="plan-reminder">
              <div className="plan-reminder-title">📋 医生开具的疗程方案</div>
              <div className="plan-reminder-content">{customer.treatmentPlan}</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {customer.photoRequired && <span className="tag tag-warning">📷 需治疗前后拍照</span>}
          {customer.needsDoctorReview && <span className="tag tag-danger">👨‍⚕️ 需医生复核</span>}
          {!customer.treatmentPlan && <span className="tag tag-danger">⚠️ 未关联疗程方案</span>}
        </div>
      </div>
    </div>
  );
}
