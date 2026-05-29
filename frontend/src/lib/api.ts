import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Attach token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return axios.post(`${API_URL}/api/v1/auth/login`, form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  me: () => apiClient.get("/auth/me"),
};

// ─── Vacancies ────────────────────────────────────────────────────────────────
export const vacanciesApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) =>
    apiClient.get("/vacancies", { params }),
  get: (id: string) => apiClient.get(`/vacancies/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post("/vacancies", data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/vacancies/${id}`, data),
  delete: (id: string) => apiClient.delete(`/vacancies/${id}`),
};

// ─── Candidates ───────────────────────────────────────────────────────────────
export const candidatesApi = {
  list: (params?: { vacancy_id?: string; stage?: string; min_score?: number }) =>
    apiClient.get("/candidates", { params }),
  get: (id: string) => apiClient.get(`/candidates/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post("/candidates", data),
  updateStage: (cvId: string, stage: string, note?: string) =>
    apiClient.patch(`/candidates/${cvId}/stage`, { stage, note }),
};

// ─── Resumes ──────────────────────────────────────────────────────────────────
export const resumesApi = {
  upload: (file: File, candidateId: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("candidate_id", candidateId);
    return apiClient.post("/resumes/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  status: (resumeId: string) => apiClient.get(`/resumes/${resumeId}/status`),
};

// ─── Screening ────────────────────────────────────────────────────────────────
export const screeningApi = {
  startSession: (data: { candidate_id: string; vacancy_id: string }) =>
    apiClient.post("/screening/start", data),
  getSession: (id: string) => apiClient.get(`/screening/${id}`),
  generateQuestions: (candidateId: string, vacancyId: string) =>
    apiClient.post(`/screening/${candidateId}/questions`, null, {
      params: { vacancy_id: vacancyId },
    }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  overview: () => apiClient.get("/analytics/overview"),
  funnel: () => apiClient.get("/analytics/funnel"),
};

// ─── Onboarding ───────────────────────────────────────────────────────────────
export const onboardingApi = {
  list: () => apiClient.get("/onboarding"),
  generate: (data: { candidate_id: string; vacancy_id: string }) =>
    apiClient.post("/onboarding/generate", data),
  generateIDP: (data: { candidate_id: string; vacancy_id: string; current_role: string; target_role: string }) =>
    apiClient.post("/onboarding/idp/generate", data),
};

// ─── WebSocket ────────────────────────────────────────────────────────────────
export const createScreeningWS = (sessionId: string, token: string): WebSocket => {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return new WebSocket(`${wsUrl}/ws/screening/${sessionId}?token=${token}`);
};

// ─── Tokens (temporary links) ─────────────────────────────────────────────────
export const tokensApi = {
  generate: (candidateId: string, vacancyId: string, tokenType: "ai_screening" | "video_presentation") =>
    apiClient.post("/tokens/generate", {
      candidate_id: candidateId,
      vacancy_id: vacancyId,
      token_type: tokenType,
    }),
  resolve: (token: string) =>
    fetch(`${API_URL}/api/v1/tokens/resolve/${token}`).then((r) => {
      if (!r.ok) throw new Error("Token not found or expired");
      return r.json();
    }),
  analyzeVideo: (token: string, transcript: string) =>
    fetch(`${API_URL}/api/v1/tokens/video/${token}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    }).then((r) => r.json()),
};
