export type CustomerStatus = 'waiting' | 'checking' | 'treating' | 'observing' | 'completed' | 'abnormal';

export interface Customer {
  id: string;
  name: string;
  gender: '男' | '女';
  age: number;
  phone: string;
  checkInTime: string;
  appointment: string;
  doctor: string;
  status: CustomerStatus;
  treatmentPlan?: string;
  photoRequired?: boolean;
  needsDoctorReview?: boolean;
}

export interface PreCheckRecord {
  customerId: string;
  timestamp: string;
  nameVerified: boolean;
  treatmentSites: string[];
  contraindications: string[];
  recentSunExposure: '无' | '轻度' | '中度' | '重度';
  medicationUse: string;
  planReviewed: boolean;
  operator: string;
}

export interface ParameterRecord {
  customerId: string;
  timestamp: string;
  deviceModel: string;
  treatmentHead: string;
  energy: string;
  pulseWidth: string;
  spotSize: string;
  passes: number;
  operator: string;
  remark?: string;
}

export interface AreaReaction {
  area: string;
  redness: '无' | '轻度' | '中度' | '明显';
  burning: '无' | '轻微' | '明显' | '强烈';
  remark?: string;
}

export interface PostObservationRecord {
  customerId: string;
  startTime: string;
  duration: number;
  areaReactions: AreaReaction[];
  coldCompressDone: boolean;
  repairMaskDone: boolean;
  sunscreenAdviceDone: boolean;
  operator: string;
  completed: boolean;
}

export type AbnormalType = 'blister' | 'severePain' | 'severeRedness' | 'burn' | 'allergy' | 'other';

export interface AbnormalReport {
  id: string;
  customerId: string;
  customerName: string;
  timestamp: string;
  type: AbnormalType;
  typeLabel: string;
  severity: '轻微' | '中度' | '严重';
  description: string;
  handling: string;
  reportedBy: string;
  reviewed?: boolean;
  reviewer?: string;
}

export interface HandoverLog {
  id: string;
  timestamp: string;
  shiftOperator: string;
  nextOperator: string;
  unfinishedObservations: string[];
  photosPending: string[];
  doctorReviews: string[];
  abnormalReports: string[];
  remark?: string;
}

export type TabKey = 'queue' | 'precheck' | 'parameters' | 'observation' | 'abnormal' | 'handover';
