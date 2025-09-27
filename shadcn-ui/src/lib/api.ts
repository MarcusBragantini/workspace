const API_BASE_URL = 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erro na requisição');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{
      token: string;
      user: { id: string; name: string; email: string; role: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(name: string, email: string, password: string) {
    return this.request<{
      message: string;
      user: { id: string; name: string; email: string };
      license: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async getCurrentUser() {
    return this.request<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>('/auth/profile');
  }

  // Admin endpoints
  async getUsers() {
    return this.request<any[]>('/admin/users');
  }

  async createUser(userData: { name: string; email: string; password: string; role: string }) {
    return this.request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: any) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getLicenses() {
    return this.request<any[]>('/admin/licenses');
  }

  async createLicense(licenseData: { user_id: string; license_type: string; duration_days: number }) {
    return this.request<any>('/admin/licenses', {
      method: 'POST',
      body: JSON.stringify(licenseData),
    });
  }

  async revokeLicense(licenseId: string) {
    return this.request<any>(`/admin/licenses/${licenseId}/revoke`, {
      method: 'POST',
    });
  }

  async getStats() {
    return this.request<{
      totalUsers: number;
      activeLicenses: number;
      totalRevenue: number;
      recentUsers: any[];
    }>('/admin/stats');
  }
}

export const apiClient = new ApiClient();
export default apiClient;