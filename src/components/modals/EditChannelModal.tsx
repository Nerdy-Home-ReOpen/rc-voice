import React, { FormEvent, useState } from 'react';
import { useSelector } from 'react-redux';

// Components
import Modal from '@/components/Modal';

// Types
import { Channel, Visibility } from '@/types';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';

interface EditChannelModalProps {
  onClose: () => void;
  channel: Channel;
}

const EditChannelModal: React.FC<EditChannelModalProps> = React.memo(
  ({ onClose, channel }) => {
    // Redux
    const sessionId = useSelector(
      (state: { sessionToken: string }) => state.sessionToken,
    );

    // Socket
    const socket = useSocket();

    // Form Control
    const [editedChannel, setEditedChannel] = useState<Partial<Channel>>({
      name: channel.name,
      settings: {
        ...channel.settings,
      },
    });

    const handleSubmit = async (e: FormEvent<Element>) => {
      e.preventDefault();
      socket?.emit('updateChannel', {
        sessionId: sessionId,
        channelId: channel.id,
        channel: editedChannel,
      });
      onClose();
    };

    return (
      <Modal
        title={`編輯${channel.isCategory ? '類別' : '頻道'}`}
        onClose={onClose}
        onSubmit={handleSubmit}
        width="300px"
        height="auto"
        buttons={[
          {
            label: '取消',
            style: 'secondary',
            onClick: onClose,
          },
          {
            label: '確定',
            style: 'primary',
            type: 'submit',
            onClick: () => {},
          },
        ]}
      >
        <div className="p-4 space-y-4">
          <input
            type="text"
            value={editedChannel.name}
            onChange={(e) =>
              setEditedChannel((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            className="w-full p-2 border rounded"
            placeholder={`${channel.isCategory ? '類別' : '頻道'}名稱`}
            required
          />
          <select
            value={editedChannel.settings?.visibility}
            onChange={(e) =>
              setEditedChannel((prev) => {
                const settings = prev.settings ?? channel.settings;
                return {
                  ...prev,
                  settings: {
                    ...settings,
                    visibility: e.target.value as Visibility,
                  },
                };
              })
            }
            className="w-full p-2 border rounded"
          >
            <option value="public">公開</option>
            <option value="private">會員</option>
            <option value="readonly">唯讀</option>
          </select>
        </div>
      </Modal>
    );
  },
);

EditChannelModal.displayName = 'EditChannelModal';

export default EditChannelModal;
