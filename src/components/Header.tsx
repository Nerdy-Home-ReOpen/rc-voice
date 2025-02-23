import { electronService } from '@/services/electron.service';
import React, { useEffect, useState } from 'react';

// CSS
import styles from '@/styles/common/header.module.css';

interface HeaderProps {
  title?: string;
  onClose?: () => void;
}

const Header: React.FC<HeaderProps> = React.memo(({ title, onClose }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    electronService.window.onMaximize(handleMaximize);
    electronService.window.onUnmaximize(handleUnmaximize);

    return () => {
      electronService.window.offMaximize(handleMaximize);
      electronService.window.offUnmaximize(handleUnmaximize);
    };
  }, []);

  const handleMinimize = () => {
    electronService.window.minimize();
  };

  const handleMaximize = () => {
    if (isMaximized) {
      electronService.window.unmaximize();
    } else {
      electronService.window.maximize();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      electronService.window.close();
    }
  };

  return (
    <div className={styles['header']}>
      {title && <div className={styles['title']}>{title}</div>}
      <div className={styles['buttons']}>
        <div className={styles['minimize']} onClick={handleMinimize} />
        <div
          className={isMaximized ? styles['restore'] : styles['maxsize']}
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        />
        <div className={styles['close']} onClick={handleClose} />
      </div>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;
