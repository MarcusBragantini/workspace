const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro na requisição');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async validateLicense(license_key: string, device_fingerprint: string) {
    return this.request('/auth/validate-license', {
      method: 'POST',
      body: JSON.stringify({ license_key, device_fingerprint }),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Admin endpoints
  async getAdminDashboard() {
    return this.request('/admin/dashboard');
  }

  async getUsers() {
    return this.request('/admin/users');
  }

  async updateUserStatus(userId: number, status: string) {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getLicenses() {
    return this.request('/admin/licenses');
  }

  async createLicense(data: {
    user_id: number;
    license_type: string;
    duration_days: number;
    max_devices?: number;
  }) {
    return this.request('/admin/licenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deactivateLicense(licenseId: number) {
    return this.request(`/admin/licenses/${licenseId}`, {
      method: 'DELETE',
    });
  }

  async extendLicense(licenseId: number, additional_days: number) {
    return this.request(`/admin/licenses/${licenseId}/extend`, {
      method: 'PUT',
      body: JSON.stringify({ additional_days }),
    });
  }
}

export const apiClient = new ApiClient();