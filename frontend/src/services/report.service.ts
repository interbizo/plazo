import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export interface Report {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  targetUserId?: string;
  reason: string;
  description?: string;
  evidence?: string[];
  status: "PENDING" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  targetUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    messages: number;
  };
}

export interface ReportMessage {
  id: string;
  reportId: string;
  senderId: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

export const reportApi = {
  // Create report
  createReport: (data: {
    targetType: string;
    targetId?: string;
    targetUserId?: string;
    reason: string;
    description?: string;
    evidence?: string[];
  }) => api.post<{ message: string; report: Report }>("/api/reports", data),

  // Get my reports
  getMyReports: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Report>>("/api/reports/my-reports", { params }),

  // Get report detail
  getReportById: (reportId: string) =>
    api.get<{ data: Report }>(`/api/reports/${reportId}`),

  // Get report messages
  getReportMessages: (reportId: string) =>
    api.get<{ data: { report: Report; messages: ReportMessage[] } }>(
      `/api/reports/${reportId}/messages`,
    ),

  // Send message to report
  createReportMessage: (reportId: string, data: { message: string }) =>
    api.post<{ data: ReportMessage }>(
      `/api/reports/${reportId}/messages`,
      data,
    ),
};
