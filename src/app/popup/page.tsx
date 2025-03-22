/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, ReactNode } from 'react';

// CSS
import header from '@/styles/common/header.module.css';

// Types
import { PopupType } from '@/types';

// Components
import CreateServerModal from '@/components/modals/CreateServerModal';
import EditServerModal from '@/components/modals/EditServerModal';
import AddChannelModal from '@/components/modals/AddChannelModal';
import EditChannelModal from '@/components/modals/EditChannelModal';
import UserSettingModal from '@/components/modals/UserSettingModal';
import EditMemberCardModal from '@/components/modals/EditMemberCardModal';
import ServerApplication from '@/components/modals/ServerApplicationModal';
import ApplyFriend from '@/components/modals/ApplyFriend';
import Dialog from '@/components/modals/Dialog';

// Services
import ipcService from '@/services/ipc.service';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';

interface HeaderProps {
  title: string;
  buttons: ('minimize' | 'maxsize' | 'close')[];
}

const Header: React.FC<HeaderProps> = React.memo(({ title, buttons }) => {
  // States
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handlers
  const handleFullscreen = () => {
    if (isFullscreen) ipcService.window.unmaximize();
    else ipcService.window.maximize();
    setIsFullscreen(!isFullscreen);
  };

  const handleMinimize = () => {
    ipcService.window.minimize();
  };

  const handleClose = () => {
    ipcService.window.close();
  };

  return (
    <div className={header['header']}>
      <div className={header['titleBox']}>
        <span className={header['title']}>{title}</span>
      </div>
      <div className={header['buttons']}>
        {buttons.includes('minimize') && (
          <div
            className={header['minimize']}
            onClick={() => handleMinimize()}
          />
        )}
        {buttons.includes('maxsize') && (
          <div
            className={isFullscreen ? header['restore'] : header['maxsize']}
            onClick={() => handleFullscreen()}
          />
        )}
        {buttons.includes('close') && (
          <div className={header['close']} onClick={() => handleClose()} />
        )}
      </div>
    </div>
  );
});

Header.displayName = 'Header';

const Modal = React.memo(() => {
  // Language
  const lang = useLanguage();

  // States
  const [header, setHeader] = useState<ReactNode | null>(null);
  const [content, setContent] = useState<ReactNode | null>(null);
  const [initialData, setInitialData] = useState<any | null>(null);

  // Effects
  useEffect(() => {
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type') as PopupType;
      if (!type) return;

      ipcService.initialData.request(type, (data) => {
        setInitialData(data);
      });

      if (!initialData) return;

      switch (type) {
        case PopupType.EDIT_MEMBER_CARD:
          setHeader(
            <Header title={lang.tr.editMemberCard} buttons={['close']} />,
          );
          setContent(<EditMemberCardModal {...initialData} />);
          break;
        case PopupType.EDIT_USER:
          setHeader(<Header title={lang.tr.editUser} buttons={['close']} />);
          setContent(<UserSettingModal {...initialData} />);
          break;
        case PopupType.CREATE_SERVER:
          setHeader(
            <Header title={lang.tr.createServer} buttons={['close']} />,
          );
          setContent(<CreateServerModal {...initialData} />);
          break;
        case PopupType.EDIT_SERVER:
          setHeader(<Header title={lang.tr.editServer} buttons={['close']} />);
          setContent(<EditServerModal {...initialData} />);
          break;
        case PopupType.DELETE_SERVER:
          // This doesn't exist lol
          break;
        case PopupType.CREATE_CHANNEL:
          setHeader(
            <Header title={lang.tr.createChannel} buttons={['close']} />,
          );
          setContent(<AddChannelModal {...initialData} />);
          break;
        case PopupType.EDIT_CHANNEL:
          setHeader(<Header title={lang.tr.editChannel} buttons={['close']} />);
          setContent(<EditChannelModal {...initialData} />);
          break;
        case PopupType.DELETE_CHANNEL:
          // This doesn't exist lol
          break;
        case PopupType.APPLY_MEMBER:
          setHeader(<Header title={lang.tr.applyMember} buttons={['close']} />);
          setContent(<ServerApplication {...initialData} />);
          break;
        case PopupType.APPLY_FRIEND:
          setHeader(<Header title={lang.tr.applyFriend} buttons={['close']} />);
          setContent(<ApplyFriend {...initialData} />);
          break;
        case PopupType.DIRECT_MESSAGE:
          // setHeader(<Header title={lang.tr.directMessage} buttons={['close']} />);
          // setContent(<DirectMessageModal onClose={() => {}} />);
          break;
        case PopupType.DIALOG_ALERT:
        case PopupType.DIALOG_ALERT2:
          setHeader(<Header title={lang.tr.dialogAlert} buttons={['close']} />);
          setContent(<Dialog {...{ ...initialData, iconType: 'ALERT' }} />);
          break;
        case PopupType.DIALOG_SUCCESS:
          setHeader(
            <Header title={lang.tr.dialogSuccess} buttons={['close']} />,
          );
          setContent(<Dialog {...{ ...initialData, iconType: 'SUCCESS' }} />);
          break;
        case PopupType.DIALOG_WARNING:
          setHeader(
            <Header title={lang.tr.dialogWarning} buttons={['close']} />,
          );
          setContent(<Dialog {...{ ...initialData, iconType: 'WARNING' }} />);
          break;
        case PopupType.DIALOG_ERROR:
          setHeader(<Header title={lang.tr.dialogError} buttons={['close']} />);
          setContent(<Dialog {...{ ...initialData, iconType: 'ERROR' }} />);
          break;
        case PopupType.DIALOG_INFO:
          setHeader(<Header title={lang.tr.dialogInfo} buttons={['close']} />);
          setContent(<Dialog {...{ ...initialData, iconType: 'INFO' }} />);
          break;
        default:
          break;
      }
    }
  }, [lang, initialData]);

  return (
    <div className="wrapper">
      {/* Top Nevigation */}
      {header}
      {/* Main Content */}
      {content}
    </div>
  );
});

Modal.displayName = 'SettingPage';

export default Modal;
