/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';

// CSS
import styles from '@/styles/loginPage.module.css';

// Utils
import { base64encode } from '@/utils/base64encode';
import { validateAccount, validatePassword } from '@/utils/validators';

// Services
import { authService } from '@/services/auth.service';
import { electronService } from '@/services/electron.service';

// Components
import InputField from '@/components/InputField';

// Redux
import { setSessionToken } from '@/redux/sessionTokenSlice';
import store from '@/redux/store';

interface FormErrors {
  general?: string;
  account?: string;
  password?: string;
  username?: string;
}

// Login Form Component
interface LoginPageData {
  account: string;
  password: string;
  rememberAccount: boolean;
  autoLogin: boolean;
}

interface LoginPageProps {
  onLoginSuccess: () => void;
  onRegisterClick: () => void;
}

const STORAGE_KEYS = {
  REMEMBER_ACCOUNT: 'rememberAccount',
  AUTO_LOGIN: 'autoLogin',
  ACCOUNT: 'savedAccount',
  ENCRYPTED_PASSWORD: 'encryptedPassword', // 應該使用更安全的方式存儲密碼
};

const encryptPassword = (password: string): string => {
  return base64encode(password);
};

const decryptPassword = (encrypted: string): string => {
  return atob(encrypted);
};

const LoginPage: React.FC<LoginPageProps> = React.memo(
  ({ onLoginSuccess, onRegisterClick }) => {
    const [formData, setFormData] = useState<LoginPageData>({
      account: '',
      password: '',
      rememberAccount: false,
      autoLogin: false,
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
      const savedRememberAccount =
        localStorage.getItem(STORAGE_KEYS.REMEMBER_ACCOUNT) === 'true';
      const savedAutoLogin =
        localStorage.getItem(STORAGE_KEYS.AUTO_LOGIN) === 'true';

      let savedAccount = '';
      if (savedRememberAccount)
        savedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT) || '';

      setFormData((prev) => ({
        ...prev,
        account: savedAccount,
        rememberAccount: savedRememberAccount,
        autoLogin: savedAutoLogin,
      }));

      // 如果啟用了自動登入，嘗試自動登入
      if (savedAutoLogin && savedAccount) {
        const savedPassword = localStorage.getItem(
          STORAGE_KEYS.ENCRYPTED_PASSWORD,
        );
        if (savedPassword) {
          // 添加延遲避免初始渲染時立即登入
          const timer = setTimeout(() => {
            attemptAutoLogin(savedAccount, decryptPassword(savedPassword));
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }, []);

    const attemptAutoLogin = async (account: string, password: string) => {
      setIsLoading(true);
      try {
        // 先檢查本地保存的 sessionToken 是否有效
        const existingToken = localStorage.getItem('sessionToken');
        if (existingToken) {
          const isValid = await authService.validateToken(existingToken);
          if (isValid) {
            store.dispatch(setSessionToken(existingToken));
            onLoginSuccess();
            return;
          }
        }

        // 如果 token 無效或不存在，使用保存的憑證重新登入
        const loginData = {
          account,
          password,
          rememberAccount: formData.rememberAccount,
          autoLogin: formData.autoLogin,
        };

        const response = await authService.login(loginData);

        // 檢查是否直接返回 sessionId 或在 data 屬性中
        const sessionId =
          response.sessionId || (response.data && response.data.sessionId);

        if (sessionId) {
          localStorage.setItem('sessionToken', sessionId);
          onLoginSuccess();
        } else {
          console.error('自動登入回應格式:', response);
          throw new Error('無法從回應中獲取 sessionId');
        }
      } catch (error) {
        console.error('自動登入失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
      const { name, value, type, checked } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>): void => {
      const { name, value } = e.target;
      if (name === 'account') {
        setErrors((prev) => ({
          ...prev,
          account: validateAccount(value),
        }));
      } else if (name === 'password') {
        setErrors((prev) => ({
          ...prev,
          password: validatePassword(value),
        }));
      }
    };

    const handleLoginSuccess = () => {
      electronService.auth.notifySuccess();
    };

    const handleSubmit = async (
      e: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
      e.preventDefault();

      setIsLoading(true);
      try {
        const response = await authService.login(formData);

        // 檢查是否直接返回 sessionId 或在 data 屬性中
        const sessionId =
          response.sessionId || (response.data && response.data.sessionId);

        if (sessionId) {
          // 儲存 session token
          localStorage.setItem('sessionToken', sessionId);
          store.dispatch(setSessionToken(sessionId));

          // 根據用戶選擇保存登入相關設置
          localStorage.setItem(
            STORAGE_KEYS.REMEMBER_ACCOUNT,
            formData.rememberAccount.toString(),
          );
          localStorage.setItem(
            STORAGE_KEYS.AUTO_LOGIN,
            formData.autoLogin.toString(),
          );

          if (formData.rememberAccount) {
            localStorage.setItem(STORAGE_KEYS.ACCOUNT, formData.account);

            // 根據用戶選擇保存登入相關設置
            localStorage.setItem(
              STORAGE_KEYS.REMEMBER_ACCOUNT,
              formData.rememberAccount.toString(),
            );
            localStorage.setItem(
              STORAGE_KEYS.AUTO_LOGIN,
              formData.autoLogin.toString(),
            );

            if (formData.rememberAccount) {
              localStorage.setItem(STORAGE_KEYS.ACCOUNT, formData.account);
            } else {
              localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
            }

            // TODO: 應該使用更安全的方式保存密碼
            if (formData.autoLogin) {
              localStorage.setItem(
                STORAGE_KEYS.ENCRYPTED_PASSWORD,
                encryptPassword(formData.password),
              );
            } else {
              localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_PASSWORD);
            }

            handleLoginSuccess();
          } else {
            localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
          }

          // TODO: 應該使用更安全的方式保存密碼
          if (formData.autoLogin) {
            localStorage.setItem(
              STORAGE_KEYS.ENCRYPTED_PASSWORD,
              encryptPassword(formData.password),
            );
          } else {
            localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_PASSWORD);
          }

          onLoginSuccess();
        } else {
          console.error('登入回應格式:', response);
          throw new Error('無法從回應中獲取 sessionId');
        }
      } catch (error) {
        setErrors({
          general: error instanceof Error ? error.message : '登入失敗',
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className={styles['loginWrapper']}>
        <div className={styles['loginContent']}>
          <div className={styles['appLogo']}></div>
          <form onSubmit={handleSubmit} className={styles['formWrapper']}>
            {errors.general && (
              <div className={styles['errorBox']}>{errors.general}</div>
            )}
            {isLoading && (
              <div className={styles['loadingIndicator']}>登入中...</div>
            )}
            <div className={styles['inputBox']}>
              <label className={styles['label']}>{'帳號'}</label>
              <InputField
                name="account"
                value={formData.account}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="請輸入帳號"
                showFunctionButton={'account'}
                style={{
                  borderColor: errors.account ? '#f87171' : '#d1d5db',
                }}
              />
            </div>
            <div className={styles['inputBox']}>
              <label className={styles['label']}>{'密碼'}</label>
              <InputField
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="請輸入密碼"
                showFunctionButton={'password'}
                style={{
                  borderColor: errors.password ? '#f87171' : '#d1d5db',
                }}
              />
            </div>
            <div className={styles['checkWrapper']}>
              <label className={styles['checkBox']}>
                <input
                  type="checkbox"
                  name="rememberAccount"
                  checked={formData.rememberAccount}
                  onChange={handleInputChange}
                  className={styles['check']}
                />
                記住帳號
              </label>
              <label className={styles['checkBox']}>
                <input
                  type="checkbox"
                  name="autoLogin"
                  checked={formData.autoLogin}
                  onChange={handleInputChange}
                  className={styles['check']}
                />
                自動登入
              </label>
            </div>
            <button type="submit" className={styles['button']}>
              登入
            </button>
          </form>
        </div>
        <div className={styles['loginFooter']}>
          <div className={styles['createAccount']} onClick={onRegisterClick}>
            註冊帳號
          </div>
          <div className={styles['forgetPassword']}>忘記密碼</div>
        </div>
      </div>
    );
  },
);

LoginPage.displayName = 'LoginPage';

export default LoginPage;
