// Services
import { apiService } from '@/services/api.service';

// Utils
import { base64encode } from '@/utils/base64encode';

interface LoginFormData {
  account: string;
  password: string;
  rememberAccount: boolean;
  autoLogin: boolean;
}

interface RegisterFormData {
  account: string;
  password: string;
  username: string;
  gender: 'Male' | 'Female';
}

export const authService = {
  login: async (formData: LoginFormData) => {
    const loginData = {
      ...formData,
      password: base64encode(formData.password),
    };
    return await apiService.post('/login', loginData);
  },

  register: async (formData: RegisterFormData) => {
    const registerData = {
      ...formData,
      password: base64encode(formData.password),
    };
    return await apiService.post('/register', registerData);
  },
};

export default authService;
