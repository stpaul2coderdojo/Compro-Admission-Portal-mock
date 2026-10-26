export type Criterion = {
  name: string;
  points: number;
  maxPoints: number;
  explanation: string;
};

export type Screening = {
  score: number;
  recommendation: 'ACCEPT' | 'REVIEW' | 'REJECT';
  criteria: Criterion[];
  summary: string;
};

export type Application = {
  id: number;
  fullName: string;
  email: string;
  education: string;
  experienceYears: number;
  programmingBackground: string;
  statement: string;
  submittedAt: string;
  screening: Screening;
  decision: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'FOLLOW_UP';
  reviewerNote: string | null;
};

export type ApplicationInput = Omit<Application, 'id' | 'submittedAt' | 'screening' | 'decision' | 'reviewerNote'>;

export interface ReviewerUser {
  username: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: ReviewerUser;
}
