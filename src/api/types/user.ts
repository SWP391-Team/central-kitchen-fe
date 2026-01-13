// User related types
export interface User {
  user_id: number;
  username: string;
  role_id: number;
  store_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role_id: number;
  store_id?: number | null;
  is_active?: boolean;
}

export interface UserUpdateRequest {
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
