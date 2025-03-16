import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';

// CSS
import friendPage from '@/styles/friendPage.module.css';
import grade from '@/styles/common/grade.module.css';

// Components
import FriendListViewer from '@/components/viewers/FriendListViewer';
import BadgeViewer from '@/components/viewers/BadgeViewer';

// Types
import { User } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// Services
import { ipcService } from '@/services/ipc.service';

const FriendPageComponent: React.FC = React.memo(() => {
  // Redux
  const user = useSelector((state: { user: User }) => state.user);

  // Hooks
  const lang = useLanguage();
  const socket = useSocket();

  // Variables
  const MAXLENGTH = 300;
  const userName = user.name;
  const userAvatarUrl = user.avatarUrl;
  const userSignature = user.signature;
  const userLevel = user.level;
  const userGrade = Math.min(56, Math.ceil(userLevel / 5)); // 56 is max level
  const userBadges = user.badges || [];
  const userFriends = user.friends || [];
  const userFriendGroups = user.friendGroups || [];

  // States
  const [signatureInput, setSignatureInput] = useState<string>(userSignature);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(256);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Handlers
  const handleChangeSignature = (signature: User['signature']) => {
    if (!socket) return;
    socket.send.updateUser({ user: { signature } });
  };

  const handleStartResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleStopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleResize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const maxWidth = window.innerWidth * 0.3;
      const newWidth = Math.max(250, Math.min(e.clientX, maxWidth));
      setSidebarWidth(newWidth);
    },
    [isResizing],
  );

  // Effects
  useEffect(() => {
    if (!lang) return;
    ipcService.discord.updatePresence({
      details: lang.tr.RPCFriendPage,
      state: `${lang.tr.RPCUser} ${userName}`,
      largeImageKey: 'app_icon',
      largeImageText: 'RC Voice',
      smallImageKey: 'home_icon',
      smallImageText: lang.tr.RPCFriend,
      timestamp: Date.now(),
      buttons: [
        {
          label: lang.tr.RPCJoinServer,
          url: 'https://discord.gg/adCWzv6wwS',
        },
      ],
    });
  }, [lang, userName]);

  useEffect(() => {
    if (!socket) return;
    socket.send.refreshUser(null);
  }, [socket]);

  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', handleStopResizing);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', handleStopResizing);
    };
  }, [handleResize, handleStopResizing]);

  return (
    <div className={friendPage['friendWrapper']}>
      {/* Header */}
      <header className={friendPage['friendHeader']}>
        <div
          className={friendPage['avatarPicture']}
          style={
            userAvatarUrl ? { backgroundImage: `url(${userAvatarUrl})` } : {}
          }
        />
        <div className={friendPage['baseInfoBox']}>
          <div className={friendPage['container']}>
            <div className={friendPage['levelIcon']} />
            <div
              className={`
                ${friendPage['userGrade']} 
                ${grade[`lv-${userGrade}`]}
              `}
            />
            <div className={friendPage['wealthIcon']} />
            <label className={friendPage['wealthValue']}>0</label>
            <div className={friendPage['vipIcon']} />
          </div>
          <div className={friendPage['container']}>
            <BadgeViewer badges={userBadges} />
          </div>
        </div>
        <div className={friendPage['signatureBox']}>
          <textarea
            className={friendPage['signatureInput']}
            value={signatureInput}
            placeholder={lang.tr.signaturePlaceholder}
            data-placeholder="30018"
            onChange={(e) => {
              if (signatureInput.length > MAXLENGTH) return;
              setSignatureInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.shiftKey) return;
              if (e.key !== 'Enter') return;
              if (isComposing) return;
              e.currentTarget.blur();
            }}
            onBlur={() => {
              if (signatureInput == userSignature) return;
              if (signatureInput.length > MAXLENGTH) return;
              handleChangeSignature(signatureInput);
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
          />
        </div>
      </header>
      {/* Main Content */}
      <main className={friendPage['friendContent']}>
        {/* Left Sidebar */}
        <div
          className={friendPage['sidebar']}
          style={{ width: `${sidebarWidth}px` }}
        >
          <FriendListViewer
            friends={userFriends}
            friendGroups={userFriendGroups}
          />
        </div>
        {/* Resize Handle */}
        <div
          className="resizeHandle"
          onMouseDown={handleStartResizing}
          onMouseUp={handleStopResizing}
        />
        {/* Right Content */}
        <div className={friendPage['mainContent']}>
          <div className={friendPage['header']}>{lang.tr.friendActive}</div>
        </div>
      </main>
    </div>
  );
});

FriendPageComponent.displayName = 'FriendPageComponent';

// use dynamic import to disable SSR
const FriendPage = dynamic(() => Promise.resolve(FriendPageComponent), {
  ssr: false,
});

export default FriendPage;
