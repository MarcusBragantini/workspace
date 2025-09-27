const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface License {
  id: number;
  license_key: string;
  license_type: string;
  expires_at: string;
  days_remaining: number;
  active_devices: number;
  max_devices: number;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface RegisterResponse {
  message: string;
  user: User;
  license: string;
}

interface ProfileResponse {
  user: User;
  licenses: License[];
}

interface AdminDashboardResponse {
  totalUsers: number;
  activeLicenses: number;
  totalRevenue: number;
  recentUsers: User[];
}

interface LicenseValidationResponse {
  valid: boolean;
  license: License;
  message: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async register(email: string, password: string, name: string): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async validateLicense(license_key: string, device_fingerprint: string): Promise<LicenseValidationResponse> {
    return this.request<LicenseValidationResponse>('/auth/validate-license', {
      method: 'POST',
      body: JSON.stringify({ license_key, device_fingerprint }),
    });
  }

  async getProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('/auth/profile');
  }

  // Admin endpoints
  async getAdminDashboard(): Promise<AdminDashboardResponse> {
    return this.request<AdminDashboardResponse>('/admin/dashboard');
  }

  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/admin/users');
  }

  async updateUserStatus(userId: number, status: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getLicenses(): Promise<License[]> {
    return this.request<License[]>('/admin/licenses');
  }

  async createLicense(data: {
    user_id: number;
    license_type: string;
    duration_days: number;
    max_devices?: number;
  }): Promise<License> {
    return this.request<License>('/admin/licenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deactivateLicense(licenseId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/licenses/${licenseId}`, {
      method: 'DELETE',
    });
  }

  async extendLicense(licenseId: number, additional_days: number): Promise<License> {
    return this.request<License>(`/admin/licenses/${licenseId}/extend`, {
      method: 'PUT',
      body: JSON.stringify({ additional_days }),
    });
  }
}

export const apiClient = new ApiClient();