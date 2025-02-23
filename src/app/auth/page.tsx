'use client';

import React, { useState } from 'react';

// CSS
import header from '@/styles/common/header.module.css';

// Pages
import LoginPage from '@/components/pages/LoginPage';
import RegisterPage from '@/components/pages/RegisterPage';

// Services
import { electronService } from '@/services/electron.service';

interface HeaderProps {
  onClose?: () => void;
}

const Header: React.FC<HeaderProps> = React.memo(({ onClose }) => {
  // Fullscreen Control
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMinimize = () => {
    electronService.window.minimize();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      electronService.window.close();
    }
  };

  return (
    <div className={`${header['header']}`}>
      {/* Title */}
      <div className={header['appIcon']} />
      {/* Buttons */}
      <div className={header['buttons']}>
        <div className={header['minimize']} onClick={handleMinimize} />
        <div
          className={isFullscreen ? header['restore'] : header['maxsize']}
          onClick={handleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        />
        <div className={header['close']} onClick={handleClose} />
      </div>
    </div>
  );
});

Header.displayName = 'Header';

const Auth: React.FC = () => {
  // State
  const [isLogin, setIsLogin] = useState<boolean>(true);

  const handleLogin = () => {};

  return (
    <>
      {/* Top Navigation */}
      <Header />
      {/* Main Content */}
      <div className="content">
        {isLogin ? (
          <LoginPage
            onLoginSuccess={() => handleLogin()}
            onRegisterClick={() => setIsLogin(false)}
          />
        ) : (
          <RegisterPage onRegisterSuccess={() => setIsLogin(true)} />
        )}
      </div>
    </>
  );
};

Auth.displayName = 'Auth';

export default Auth;
