import React from 'react';

import Popup from '../../styles/common/popup.module.css';

interface DialogProps {
  popupIcon: string;
  textBorder: string;
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const Dialog: React.FC<DialogProps> = ({
  popupIcon,
  textBorder,
  title,
  onSubmit,
  onClose,
}) => {
  console.log(popupIcon, textBorder, title);
  return (
    <div className={Popup['inputGroup']}>
      <div className={Popup['inputBox']}>
        <div className={`${Popup['popupIcon']} ${Popup[popupIcon]}`}></div>
        <div className={textBorder}>
          <div className={Popup['title']}>{title}</div>
        </div>
      </div>
    </div>
  );
};

Dialog.displayName = 'Dialog';

export default Dialog;
