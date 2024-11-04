import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://mark77.onrender.com/';

export interface ApiResponse {
  status: string;
  token: string;
  message: string;
  timetable?: any; // or replace 'any' with the specific type if known
  data: any;
}

export interface CheckoutResponse {
  status: string;
  message: string;
}

export interface UserData {
  id: string;
  name: string;
  role: string;
  email: string;
  year?: string;
  branch?: string;
  department?: string;
}

export interface OverallAnalytics {
  total_students: number;
  total_classes: number;
  attendance: number;
  average_attendance: number;
  attendance_trend: {
    date: string;
    attendance_rate: number;
  }[];
  zone_distribution: {
    green: number;
    yellow: number;
    red: number;
  };
}
export interface DetainedStudent {
  user_id: string;
  name: string;
  attendance_percentage: number;
}

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  year?: string;
  branch?: string;
  department?: string;
}

export interface Checkout{
  "attendance_id": "string"
}

export interface AttendanceMarkRequest {
  wifi_name: string;
  block_name: string;
}

export interface AttendanceCorrectionRequest {
  attendance_id: string;
  reason: string;
}

export interface TimetableEntry {
  timetable_user_id: string;
  day: string;
  period: string;
  start_time: string;
  end_time: string;
  block_name: string;
  wifi_name: string;
}

export interface AttendanceUpdateRequest {
  attendance_id: string;
  new_status: string;
}

class ApiService {
  private api: AxiosInstance;
  private currentUser: UserData | null = null;

  
  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use(
      async (config) => {
        const token = await this.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('token');
  }

  private async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem('token', token);
  }

  private handleApiError(error: any): Error {
    console.log('API Error:', error.response || error);
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return new Error(errorMessage);
  }

  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      console.log('Login Request:', { username, password });
      
      const response = await this.api.post<ApiResponse>('/shared/login', {
        username,
        password
      }, {
        timeout: 15000, // Increased timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Login Response:', response.data);
      
      if (response.data.status === 'success' && response.data.token) {
        await this.setToken(response.data.token);
        return response.data;
      }
      throw new Error('Invalid login response');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error('Please check your internet connection and try again');
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timed out. Please try again');
        }
      }
      throw this.handleApiError(error);
    }
  }
  async register(userData: Omit<UserData, 'id'>): Promise<ApiResponse> {
    try {
      const response = await this.api.post<ApiResponse>('/shared/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('token');
    this.currentUser = null;
  }

  // Student APIs
  async getStudentProfile(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/student/profile');
    return response.data;
  }

  async updateStudentProfile(data: ProfileUpdateData): Promise<ApiResponse> {
    const response = await this.api.put<ApiResponse>('/student/profile', data);
    return response.data;
  }

  async markAttendance(data: AttendanceMarkRequest): Promise<ApiResponse> {
    const response = await this.api.post<ApiResponse>('/student/mark_attendance', data);
    return response.data;
  }


  async getTimetableEntries(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/view_timetable');
    console.log('Faculty Timetable Response:', response.data);
    return response.data;
  }

  async getTimetable(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/student/view_timetable');
    console.log('Student Timetable Response:', response.data);
    return response.data;
  }

  async getAttendanceHistory(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/student/attendance_history');
    return response.data;
  }

  async getAttendanceAnalytics(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/student/attendance_analytics');
    return response.data;
  }

  async getAttendanceReport(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/student/attendance_report');
    return response.data;
  }

  async requestAttendanceCorrection(data: AttendanceCorrectionRequest): Promise<ApiResponse> {
    const response = await this.api.post<ApiResponse>('/student/request_correction', data);
    return response.data;
  }


  // Faculty APIs
  async getFacultyProfile(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/profile');
    return response.data;
  }

  async updateFacultyProfile(data: ProfileUpdateData): Promise<ApiResponse> {
    const response = await this.api.put<ApiResponse>('/faculty/profile', data);
    return response.data;
  }

  async enterTimetable(data: TimetableEntry): Promise<ApiResponse> {
    const response = await this.api.post<ApiResponse>('/faculty/enter_timetable', data);
    return response.data;
  }

  

  async getAttendanceStatistics(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/attendance_statistics');
    return response.data;
  }

  async getDetainedStudents(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/detained_students');
    return response.data;
  }

  async exportAttendance(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/export_attendance');
    return response.data;
  }

  async getUnreadNotifications(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/notifications');
    return response.data;
  }

  async getOverallAnalytics(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/overall_analytics');
    return response.data;
  }

  async getPendingRequests(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/pending_requests');
    return response.data;
  }


  async checkout(): Promise<ApiResponse> {
    try {
      const response = await this.api.post<ApiResponse>('/student/checkout');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
  async getStudentAnalytics(): Promise<ApiResponse> {
    try {
      console.log('Fetching student analytics...');
      const response = await this.api.get('/faculty/student_analytics');
      console.log('Student analytics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Student analytics error:', error);
      throw this.handleApiError(error);
    }
  }

  async getStudentsByAttendance(): Promise<ApiResponse> {
    const response = await this.api.get<ApiResponse>('/faculty/students_by_attendance');
    return response.data;
  }

  async updateAttendance(data: AttendanceUpdateRequest): Promise<ApiResponse> {
    const response = await this.api.put<ApiResponse>('/faculty/update_attendance', data);
    return response.data;
  }
}

export const apiService = new ApiService();
