import React, { FormEvent, useState } from 'react';
import { useSelector } from 'react-redux';

// Components
import Modal from '@/components/Modal';

// Types
import { Channel, Visibility } from '@/types';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';

// Validation
const validateName = (name: string): string => {
  if (!name.trim()) return '請輸入頻道名稱';
  if (name.length > 30) return '頻道名稱不能超過30個字符';
  return '';
};

interface ChannelFormData {
  name: string;
  visibility: Visibility;
}

interface FormErrors {
  general?: string;
  name?: string;
}

interface EditChannelModalProps {
  onClose: () => void;
  channel: Channel;
}
const EditChannelModal: React.FC<EditChannelModalProps> = React.memo(
  ({ onClose, channel }) => {
    // Socket
    const socket = useSocket();

    // Redux
    const sessionId = useSelector(
      (state: { sessionToken: string }) => state.sessionToken,
    );

    // Form Control
    const [formData, setFormData] = useState<ChannelFormData>({
      name: channel.name,
      visibility: channel.settings.visibility,
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const nameError = validateName(formData.name);

      setErrors({
        name: nameError,
      });

      const editedChannel: Channel = {
        ...channel,
        name: formData.name,
        settings: {
          ...channel.settings,
          visibility: formData.visibility,
        },
      };

      if (!nameError) {
        socket?.emit('editChannel', {
          sessionId: sessionId,
          channel: editedChannel,
        });
        socket?.on('error', (error: { message: string }) => {
          setErrors({
            general: error.message,
          });
        });
        onClose();
      }
    };

    return (
      <Modal
        title={`編輯${channel.isCategory ? '類別' : '頻道'}`}
        submitText="確定"
        onClose={onClose}
        onSubmit={handleSubmit}
        width="400px"
        height="300px"
      >
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              name: e.target.value,
            }))
          }
          className="w-full p-2 border rounded mb-4"
          placeholder={`${channel.isCategory ? '類別' : '頻道'}名稱`}
          required
        />
        <select
          value={formData.visibility}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              visibility: e.target.value as Visibility,
            }))
          }
          className="w-full p-2 border rounded mb-4"
        >
          <option value="public">公開</option>
          <option value="private">會員</option>
          <option value="readonly">唯讀</option>
        </select>
      </Modal>
    );
  },
);
EditChannelModal.displayName = 'EditChannelModal';

export default EditChannelModal;
