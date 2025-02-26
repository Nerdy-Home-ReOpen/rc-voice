import React, { useState } from 'react';

// CSS
import styles from '@/styles/common/header.module.css';

interface TitleType {
  title?: string;
  button?: Array<string>;
}

interface HeaderProps {
  title?: TitleType;
  onClose: () => void;
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

  console.log(title);

  return (
    <div className={styles['header']}>
      <div className={styles['titleBox']}>
        {title?.title && <span className={styles['title']}>{title.title}</span>}
      </div>
      <div className={styles['buttons']}>
        {title?.button?.includes('minimize') && (
          <div className={styles['minimize']} />
        )}
        {title?.button?.includes('maxsize') && (
          <div
            className={isFullscreen ? styles['restore'] : styles['maxsize']}
            onClick={handleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          />
        )}
        <div className={styles['close']} onClick={onClose} />
      </div>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;
