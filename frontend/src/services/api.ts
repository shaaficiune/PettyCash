import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper: clear session and signal AuthContext to redirect via React Router
// (never use window.location.href — that causes a hard page reload)
const clearSessionAndRedirect = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Dispatch a custom event that AuthContext listens to, so
  // setUser(null) is called and ProtectedRoute redirects via React Router.
  window.dispatchEvent(new CustomEvent('auth:logout'));
};

// Inject Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s — try to refresh the token, otherwise sign out cleanly.
// IMPORTANT: skip auth endpoints entirely so a failed login (wrong password)
// or a failed refresh don't accidentally trigger a session-clear redirect.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url: string = originalRequest?.url || '';

    // Never intercept auth routes — let them fail naturally to their callers
    const isAuthEndpoint = url.includes('/auth/login') ||
                           url.includes('/auth/refresh') ||
                           url.includes('/auth/logout');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — sign out without a hard reload
          clearSessionAndRedirect();
        }
      } else {
        // No refresh token at all — sign out without a hard reload
        clearSessionAndRedirect();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
