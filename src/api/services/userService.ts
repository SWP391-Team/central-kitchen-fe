import api from '../axiosConfig';
import { 
  LoginRequest, 
  LoginResponse, 
  User, 
  UserCreateRequest, 
  UserUpdateRequest,
  ApiResponse 
} from '../types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return response.data.data;
  },
};

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>('/users');
    return response.data.data;
  },

  getUserById: async (id: number): Promise<User> => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data;
  },

  createUser: async (userData: UserCreateRequest): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/users', userData);
    return response.data.data;
  },

  updateUser: async (id: number, userData: UserUpdateRequest): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, userData);
    return response.data.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
