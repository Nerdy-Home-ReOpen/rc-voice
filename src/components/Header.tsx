import React, { useState } from 'react';

// CSS
import styles from '@/styles/common/header.module.css';

interface HeaderProps {
  title?: string;
  onClose?: () => void;
}

const Header: React.FC<HeaderProps> = React.memo(({ title, onClose }) => {
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

  return (
    <div className={styles['header']}>
      <div className={styles['titleBox']}>
        {title && <span className={styles['title']}>{title}</span>}
      </div>
      <div className={styles['buttons']}>
        <div className={styles['minimize']} />
        <div
          className={isFullscreen ? styles['restore'] : styles['maxsize']}
          onClick={handleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        />
        <div className={styles['close']} onClick={onClose} />
      </div>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;
