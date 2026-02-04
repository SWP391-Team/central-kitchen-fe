export interface User {
  user_id: number;
  user_code: string;
  username: string;
  role_id: number;
  store_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: Date;
}

export interface UserCreateRequest {
  user_code: string;
  username: string;
  password: string;
  role_id: number;
  store_id?: number | null;
  is_active?: boolean;
}

export interface UserUpdateRequest {
  user_code?: string; 
  username?: string;
  password?: string;
  role_id?: number;
  store_id?: number | null;
  is_active?: boolean;
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
