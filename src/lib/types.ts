export type Patient = {
  id: number;
  name: string;
  age: number;
  nationalId: string | null;
  phone: string | null;
  bloodType: string;
  hospital: string;
  gender: string;
  recordDate: string;
  createdAt: string;
};

export type Employee = {
  id: number;
  name: string;
  role: string;
  hireDate: string;
  status: string;
  phone: string | null;
  createdAt: string;
};

export type Donor = {
  id: number;
  code: string;
  name: string;
  age: number;
  gender: string;
  phone: string | null;
  nationalId: string | null;
  address: string | null;
  initialExam: string;
  bloodType: string;
  vitalSigns: string | null;
  hemoglobin: number | null;
  eligibility: string;
  ineligibilityReason: string | null;
  stage: string;
  status: string;
  registerDate: string;
  createdAt: string;
};

export type LabTest = {
  id: number;
  donorId: number;
  donorCode: string;
  donorName: string;
  hiv: string;
  hepatitisB: string;
  hepatitisC: string;
  htlv: string;
  syphilis: string;
  malaria: string;
  decision: string;
  reason: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  testedBy?: string | null;
  testedAt: string;
};

export type BlacklistEntry = {
  id: number;
  donorId: number | null;
  donorCode: string;
  donorName: string;
  type: string;
  reason: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  activeStatus?: "final" | "active" | "expired";
};

export type BloodUnit = {
  id: number;
  unitNumber: string;
  bloodType: string;
  rh: string;
  component: string;
  status: string;
  collectionDate: string;
  expiryDate: string;
  quantity: number;
  storageLocation: string;
  sourceCode: string | null;
  createdAt: string;
};

export type DonationPost = {
  id: number;
  bloodType: string;
  component: string;
  unitsNeeded: number;
  hospital: string;
  phone: string | null;
  urgency: string;
  publishDate: string;
  notes: string | null;
  status: string;
  createdAt: string;
};

export type InventoryRow = {
  bloodType: string;
  component: string;
  units: number;
  quantity: number;
  nearestExpiry: string | null;
};

export type FieldErrors = Record<string, string>;

export type ApiError = {
  message: string;
  errors?: FieldErrors;
};
