export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'candidate';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  memoryLimit: number;
  sampleInput?: string;
  sampleOutput?: string;
  tags: string[];
}

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  duration: number;
  passingScore: number;
  totalScore: number;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

export interface Submission {
  id: string;
  language: string;
  code: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  score: number;
  maxScore: number;
  passedTests: number;
  totalTests: number;
}
