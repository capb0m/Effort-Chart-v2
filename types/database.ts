export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityRecord {
  id: string;
  user_id: string;
  category_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  category_id: string | null;
  type: "daily" | "period";
  target_hours: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimerSession {
  id: string;
  user_id: string;
  start_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  whatpulse_username: string | null;
  whatpulse_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatPulseDailyStat {
  id: string;
  user_id: string;
  date: string;
  total_keys: number;
  total_clicks: number;
  fetched_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Category, "id" | "created_at">>;
      };
      records: {
        Row: ActivityRecord;
        Insert: Omit<ActivityRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ActivityRecord, "id" | "created_at">>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Goal, "id" | "created_at">>;
      };
      timer_sessions: {
        Row: TimerSession;
        Insert: Omit<TimerSession, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<TimerSession, "id" | "created_at">>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserProfile, "id" | "created_at">>;
      };
      whatpulse_daily_stats: {
        Row: WhatPulseDailyStat;
        Insert: Omit<WhatPulseDailyStat, "id">;
        Update: Partial<Omit<WhatPulseDailyStat, "id">>;
      };
      user_achievements: {
        Row: UserAchievement;
        Insert: Omit<UserAchievement, "id">;
        Update: Partial<Omit<UserAchievement, "id">>;
      };
    };
  };
}

// API Response Types
export interface RecordWithCategory extends ActivityRecord {
  categories: Category | null;
}

export interface StackedChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    fill: boolean;
    categoryId: string;
  }[];
  overallGoal?: number | null;
  periodGoals?: { start: string; end: string; hours: number }[];
}

export interface TimelineChartData {
  segments: {
    categoryId: string;
    categoryName: string;
    color: string;
    startTime: string;
    endTime: string;
    hours: number;
  }[];
  totalHours: number;
  date: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastAchievedDate: string | null;
}

export interface GoalHistoryEntry {
  date: string;
  rate: number;
  achieved: boolean;
  actualHours: number;
  targetHours: number;
}

export interface GoalHistory {
  daily: GoalHistoryEntry[];
  weekly: { week: string; rate: number }[];
  monthly: { month: string; rate: number }[];
}
