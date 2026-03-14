export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    user_code: string;
    username: string;
    role_id: number;
    location_id: number | null;
    location_ids: number[];
  };
}
