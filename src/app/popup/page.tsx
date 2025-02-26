/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';

// Components
import Header from '@/components/Header';

// Contexts
import { useModal } from '@/context/modalContext';

// Modals
import CreateServerModal from '@/components/modals/CreateServerModal';

const Modal = React.memo(() => {
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    // if window has query
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      setType(type);
    }
  }, []);

  const getTitle = () => {
    switch (type) {
      case 'create-server':
        return '創建語音群';
      case 'profile':
        return 'Profile';
      case 'server':
        return 'Server';
      default:
        return '';
    }
  };
  const getMainContent = () => {
    switch (type) {
      case 'create-server':
        return (
          <CreateServerModal
            onClose={() => {}}
            handleNextCreate={function (): void {
              throw new Error('Function not implemented.');
            }}
          />
        );
      case 'profile':
      // return <FriendPage />;
      case 'server':
      // return <ServerPage />;
      default:
        return <></>;
    }
  };
  const getButtons = () => {};

  // if (!isOpen) return null;
  return (
    <div
      className={`fixed w-full h-full flex-1 flex-col bg-white rounded shadow-lg overflow-hidden transform outline-g`}
    >
      {/* Top Nevigation */}
      <Header title={getTitle()} onClose={() => {}}></Header>
      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-y-auto">
        {getMainContent()}
      </div>
      {/* Bottom */}
      <div className="flex flex-row justify-end items-center bg-gray-50">
        {/* {hasButtons && (
            <div className="flex justify-end gap-2 p-4 bg-gray-50">
              {buttons.map((button, i) => (
                <button
                  key={i}
                  type={button.type}
                  onClick={button.onClick}
                  className={`px-4 py-2 rounded ${getButtonStyle(
                    button,
                    false,
                  )}`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          )} */}
      </div>
    </div>
  );
});

Modal.displayName = 'SettingPage';

export default Modal;
