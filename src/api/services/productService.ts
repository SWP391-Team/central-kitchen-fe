import api from '../axiosConfig';
import { 
  Product, 
  ProductCreateRequest, 
  ProductUpdateRequest,
  ApiResponse 
} from '../types';

export const productService = {
  getAllProducts: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products');
    return response.data.data;
  },

  getActiveProducts: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products/active');
    return response.data.data;
  },

  getProductById: async (id: number): Promise<Product> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data;
  },

  createProduct: async (productData: ProductCreateRequest): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>('/products', productData);
    return response.data.data;
  },

  updateProduct: async (id: number, productData: ProductUpdateRequest): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, productData);
    return response.data.data;
  },

  toggleProductActive: async (id: number): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}/toggle-active`);
    return response.data.data;
  },

  searchProducts: async (searchTerm: string): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>(`/products/search?q=${encodeURIComponent(searchTerm)}`);
    return response.data.data;
  },
};
