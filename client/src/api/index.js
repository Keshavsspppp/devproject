import { http } from './http.js';

export const authApi = {
  register: (body) => http.post('/auth/register', body).then((r) => r.data),
  login: (body) => http.post('/auth/login', body).then((r) => r.data),
  logout: () => http.post('/auth/logout').then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data),
  demo: () => http.post('/auth/demo').then((r) => r.data),
};

export const orgApi = {
  list: () => http.get('/orgs').then((r) => r.data),
  get: (orgId) => http.get(`/orgs/${orgId}`).then((r) => r.data),
  create: (body) => http.post('/orgs', body).then((r) => r.data),
  addMember: (orgId, body) => http.post(`/orgs/${orgId}/members`, body).then((r) => r.data),
};

export const repoApi = {
  list: (orgId) => http.get('/repos', { params: { orgId } }).then((r) => r.data),
  get: (id) => http.get(`/repos/${id}`).then((r) => r.data),
  create: (body) => http.post('/repos', body).then((r) => r.data),
  pulls: (repoId) => http.get(`/repos/${repoId}/pulls`).then((r) => r.data),
  pull: (repoId, number) => http.get(`/repos/${repoId}/pulls/${number}`).then((r) => r.data),
};

export const sessionApi = {
  list: (params) => http.get('/sessions', { params }).then((r) => r.data),
  get: (id) => http.get(`/sessions/${id}`).then((r) => r.data),
  create: (body) => http.post('/sessions', body).then((r) => r.data),
  patch: (id, body) => http.patch(`/sessions/${id}`, body).then((r) => r.data),
  comments: (id) => http.get(`/sessions/${id}/comments`).then((r) => r.data),
  addComment: (id, body) => http.post(`/sessions/${id}/comments`, body).then((r) => r.data),
  patchComment: (id, commentId, body) => http.patch(`/sessions/${id}/comments/${commentId}`, body).then((r) => r.data),
};

export const threadApi = {
  list: (params) => http.get('/threads', { params }).then((r) => r.data),
  get: (id) => http.get(`/threads/${id}`).then((r) => r.data),
  create: (body) => http.post('/threads', body).then((r) => r.data),
  reply: (id, body) => http.post(`/threads/${id}/replies`, body).then((r) => r.data),
  setStatus: (id, status) => http.patch(`/threads/${id}`, { status }).then((r) => r.data),
};

export const aiApi = {
  provider: () => http.get('/ai/provider').then((r) => r.data),
};

export const githubApi = {
  status: () => http.get('/github/status').then((r) => r.data),
  connect: () => http.get('/github/connect').then((r) => r.data),
};
