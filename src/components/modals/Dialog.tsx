/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';

// CSS
import popup from '@/styles/common/popup.module.css';
import dialog from '@/styles/popups/dialog.module.css';

// Services
import { ipcService } from '@/services/ipc.service';

enum DIALOG_ICON {
  ALERT = 'alert',
  ALERT2 = 'alert2',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success',
}

interface DialogProps {
  iconType: keyof typeof DIALOG_ICON;
  title: React.ReactNode;
  submitTo: string;
}

const Dialog: React.FC<DialogProps> = (initialData: DialogProps) => {
  const { iconType, title, submitTo } = initialData;

  const handleClose = () => {
    ipcService.window.close();
  };

  const handleSubmit = () => {
    ipcService.popup.submit(submitTo);
    handleClose();
  };

  return (
    <div className={popup['popupContainer']}>
      <div className={popup['popupBody']}>
        <div className={dialog['body']}>
          <div className={dialog['inputGroup']}>
            <div className={popup['inputBox']}>
              <div
                className={`${dialog['dialogIcon']} ${
                  popup[DIALOG_ICON[iconType]]
                }`}
              ></div>
              <div className={popup['textBorder']}>
                <div className={popup['title']}>{title}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={popup['popupFooter']}>
        <button className={popup['button']} onClick={handleSubmit}>
          確定
        </button>
      </div>
    </div>
  );
};

Dialog.displayName = 'Dialog';

export default Dialog;
