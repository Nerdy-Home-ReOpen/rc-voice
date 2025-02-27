/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable react/display-name */
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Edit, Plus, Trash } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

// CSS
import styles from '@/styles/serverPage.module.css';
import grade from '@/styles/common/grade.module.css';
import permission from '@/styles/common/permission.module.css';

// Types
import type { Channel, Server, User } from '@/types';

// Redux
import store from '@/redux/store';

// Hooks
import { useSocket } from '@/hooks/SocketProvider';
import { useContextMenu } from '@/components/ContextMenuProvider';

// Components
import BadgeViewer from '@/components/viewers/BadgeViewer';

// Services
import { ipcService } from '@/services/ipc.service';

interface CategoryTabProps {
  category: Channel;
  server: Server;
  canEdit: boolean;
  index: number;
}

const CategoryTab: React.FC<CategoryTabProps> = React.memo(
  ({ category, server, canEdit, index }) => {
    // Expanded Control
    const [expanded, setExpanded] = useState<boolean>(true);

    // Context Menu
    const contextMenu = useContextMenu();

    const categoryVisibility = category.settings.visibility ?? 'public';
    const categoryName = category.name ?? '';
    const categoryChannels: Channel[] = []; //FIXME

    return (
      <Draggable
        draggableId={category.id}
        index={index}
        isDragDisabled={!canEdit}
      >
        {(provided) => (
          <div ref={provided.innerRef} {...provided.draggableProps}>
            {/* Category View */}
            <div
              {...provided.dragHandleProps}
              className={`${styles['channelTab']} ${
                expanded ? styles['expanded'] : ''
              } ${
                category.isLobby ? styles['lobby'] : styles[categoryVisibility]
              }`}
              onClick={() =>
                setExpanded(
                  categoryVisibility != 'readonly' ? !expanded : false,
                )
              }
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                contextMenu.showContextMenu(e.pageX, e.pageY, [
                  {
                    id: 'edit',
                    icon: <Edit size={14} className="w-5 h-5 mr-2" />,
                    label: '編輯',
                    show: canEdit,
                    onClick: () =>
                      ipcService.popup.open('edit-channel', 400, 300),
                  },
                  {
                    id: 'add',
                    icon: <Plus size={14} className="w-5 h-5 mr-2" />,
                    label: '新增',
                    show: canEdit && category.isRoot,
                    onClick: () =>
                      ipcService.popup.open('create-channel', 400, 300),
                  },
                  {
                    id: 'delete',
                    icon: <Trash size={14} className="w-5 h-5 mr-2" />,
                    label: '刪除',
                    show: canEdit && !category.isLobby,
                    onClick: () =>
                      ipcService.popup.open('delete-channel', 400, 300),
                  },
                ]);
              }}
            >
              <div className={styles['channelTabLable']}>{categoryName}</div>
            </div>

            {/* Expanded Sections */}
            {expanded && (
              <Droppable
                droppableId={`category-${category.id}`}
                type="CHANNEL"
                isDropDisabled={!canEdit}
                isCombineEnabled={true}
                ignoreContainerClipping={true}
              >
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={styles['channelList']}
                  >
                    {categoryChannels
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((channel, index) =>
                        channel.isCategory ? (
                          <CategoryTab
                            key={channel.id}
                            category={channel}
                            server={server}
                            canEdit={canEdit}
                            index={index}
                          />
                        ) : (
                          <ChannelTab
                            key={channel.id}
                            channel={channel}
                            server={server}
                            canEdit={canEdit}
                            index={index}
                          />
                        ),
                      )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        )}
      </Draggable>
    );
  },
);

interface ChannelTabProps {
  channel: Channel;
  server: Server;
  canEdit: boolean;
  index: number;
}

const ChannelTab: React.FC<ChannelTabProps> = React.memo(
  ({ channel, server, canEdit, index }) => {
    // Redux
    const user = useSelector((state: { user: User | null }) => state.user);

    // Socket
    const socket = useSocket();

    // Context Menu
    const contextMenu = useContextMenu();

    // Expanded Control
    const [expanded, setExpanded] = useState<boolean>(true);

    const handleJoinChannel = (channelId: string) => {
      if (user?.currentChannelId == channelId) return;
      socket?.connectChannel(channelId);
    };

    const channelVisibility = channel.settings.visibility ?? 'public';
    const channelName = channel.name ?? '';
    const channelUsers =
      server.users?.filter((u) => u.currentChannelId === channel.id) ?? [];
    const userInChannel = user?.currentChannelId === channel.id;

    return (
      <Draggable
        draggableId={channel.id}
        index={index}
        isDragDisabled={!canEdit}
      >
        {(provided) => (
          <div ref={provided.innerRef} {...provided.draggableProps}>
            {/* Channel View */}
            <div
              {...provided.dragHandleProps}
              className={`${styles['channelTab']} ${
                expanded ? styles['expanded'] : ''
              } ${
                channel.isLobby ? styles['lobby'] : styles[channelVisibility]
              } ${userInChannel ? styles['userCurrentLocation'] : ''} ${
                !channel.isRoot ? styles['subChannel'] : ''
              }`}
              onClick={() =>
                setExpanded(channelVisibility != 'readonly' ? !expanded : false)
              }
              onDoubleClick={() => {
                channelVisibility !== 'readonly' &&
                  handleJoinChannel(channel.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                contextMenu.showContextMenu(e.pageX, e.pageY, [
                  {
                    id: 'edit',
                    icon: <Edit size={14} className="w-5 h-5 mr-2" />,
                    label: '編輯',
                    show: canEdit,
                    onClick: () =>
                      ipcService.popup.open('edit-channel', 400, 300),
                  },
                  {
                    id: 'add',
                    icon: <Plus size={14} className="w-5 h-5 mr-2" />,
                    label: '新增',
                    show: canEdit && !channel.isLobby && channel.isRoot,
                    onClick: () =>
                      ipcService.popup.open('create-channel', 400, 300),
                  },
                  {
                    id: 'delete',
                    icon: <Trash size={14} className="w-5 h-5 mr-2" />,
                    label: '刪除',
                    show: canEdit && !channel.isLobby,
                    onClick: () =>
                      ipcService.popup.open('delete-channel', 400, 300),
                  },
                ]);
              }}
            >
              <div className={styles['channelTabLable']}>{channelName}</div>
              <div className={styles['channelTabCount']}>
                {`(${channelUsers.length})`}
              </div>
            </div>
            {/* Expanded Sections */}
            {expanded && (
              <div className={styles['userList']}>
                {channelUsers
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((user: User) => (
                    <UserTab
                      key={user.id}
                      user={user}
                      server={server}
                      canEdit={canEdit}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  },
);

interface UserTabProps {
  server: Server;
  user: User;
  canEdit: boolean;
}

const UserTab: React.FC<UserTabProps> = React.memo(
  ({ user, server, canEdit }) => {
    // Socket
    const socket = useSocket();

    // Context
    const contextMenu = useContextMenu();

    // User Info Block Control
    const [showInfoBlock, setShowInfoBlock] = useState<boolean>(false);
    const infoBlockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (infoBlockRef.current?.contains(event.target as Node))
          setShowInfoBlock(false);
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const channelUser = user;
    const channelUserMember = server.members?.[user.id];
    const channelUserPermission = channelUserMember?.permissionLevel ?? 1;
    const channelUserNickname = channelUserMember?.nickname ?? user.name;
    const channelUserLevel = Math.min(56, Math.ceil(user.level / 5)); // 56 is max level
    const channelUserGender = user.gender;
    const channelUserBadges = user.badges ?? [];

    const handleKickUser = (targetId: string) => {};

    const handleAddFriend = (targetId: string) => {};

    return (
      <div key={user.id} ref={infoBlockRef}>
        {/* User View */}
        <div
          className={`${styles['userTab']}`}
          data-user-block
          data-user-id={user.id}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // setContentMenuPos({ x: e.pageX, y: e.pageY });
            // setShowInfoBlock(true);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            contextMenu.showContextMenu(e.pageX, e.pageY, [
              {
                id: 'kick',
                icon: <Trash size={14} className="w-5 h-5 mr-2" />,
                label: '踢出',
                show: canEdit && user.id != channelUser.id,
                onClick: () => {
                  handleKickUser(user.id);
                },
              },
              {
                id: 'addFriend',
                icon: <Plus size={14} className="w-5 h-5 mr-2" />,
                label: '新增好友',
                show: canEdit && user.id != channelUser.id,
                onClick: () => {
                  handleAddFriend(user.id);
                },
              },
            ]);
          }}
        >
          <div className={styles['userState']} />
          <div
            className={`${styles['userIcon']} ${
              permission[channelUserGender]
            } ${permission[`lv-${channelUserPermission}`]}`}
          />
          <div className={styles['userTabName']}>{channelUserNickname}</div>
          <div
            className={`${styles['userGrade']} ${
              grade[`lv-${channelUserLevel}`]
            }`}
          />
          <BadgeViewer badges={channelUserBadges} maxDisplay={3} />
          {channelUser.id === user.id && (
            <div className={styles['myLocationIcon']} />
          )}
        </div>

        {/* User Info Block */}
        {/* FIXME */}
        {/* {showInfoBlock && (
          <UserInfoBlock
            onClose={() => setShowInfoBlock(false)}
            x={contentMenuPos.x}
            y={contentMenuPos.y}
            user={user}
          />
        )} */}
      </div>
    );
  },
);

interface ChannelViewerProps {
  channels: Channel[] | null;
}

const ChannelViewer: React.FC<ChannelViewerProps> = ({ channels }) => {
  if (!channels) return null;

  // Redux
  const user = useSelector((state: { user: User }) => state.user);
  const server = useSelector((state: { server: Server }) => state.server);

  // Socket
  const socket = useSocket();

  // Context
  const contextMenu = useContextMenu();

  const connectStatus = 3;
  const userCurrentChannel = channels.find(
    (ch) => ch.id == user.currentChannelId,
  );
  const userCurrentChannelName = userCurrentChannel?.name ?? '';
  const userMember = server.members?.[user.id];
  const userPermission = userMember?.permissionLevel ?? 1;
  const serverChannels = server.channels ?? [];
  const canEdit = userPermission >= 5;

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, combine } = result;

    // Validation
    const movedChannel = channels?.find((ch) => ch.id === draggableId);
    if (!movedChannel) return;

    // Permission check
    if (!canEdit) return;

    // Prevent lobby movement restrictions
    if (
      movedChannel.isLobby &&
      (combine || destination?.droppableId !== 'root')
    ) {
      return;
    }

    // Helper to emit updates
    const emitUpdates = (updates: Partial<Channel>[]) => {
      if (updates.length === 0) return;
      socket?.updateChannel(updates);
    };

    // Handle combining channels
    if (combine) {
      const targetChannel = channels?.find(
        (ch) => ch.id === combine.draggableId,
      );
      if (!targetChannel || targetChannel.isLobby) return;

      // Calculate order for moved channel
      const siblings =
        channels?.filter((ch) =>
          ch.subChannels?.some((sub) => sub.id === targetChannel.id),
        ) || [];
      const newOrder = siblings.length;

      const updates: Partial<Channel>[] = [
        {
          id: targetChannel.id,
          order: targetChannel.order,
          // parentChannelId: null,
          isCategory: true,
        },
        {
          id: movedChannel.id,
          order: newOrder,
          // parentChannelId: targetChannel.id,
          isCategory: false,
        },
      ];

      // Update order of siblings in source
      const sourceChannels = channels?.filter((ch) =>
        ch.subChannels?.some((sub) => sub.id === movedChannel.id),
      );

      if (sourceChannels) {
        const sourceUpdates = sourceChannels.map(
          (ch, idx): Partial<Channel> => ({
            id: ch.id,
            order: idx,
            // parentChannelId: null,
            isCategory: ch.isCategory,
          }),
        );
        updates.push(...sourceUpdates);
      }

      emitUpdates(updates);
      return;
    }

    // Handle regular drag and drop
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const targetParentId =
      destination.droppableId === 'root'
        ? null
        : destination.droppableId.replace('category-', '');

    // Get channels at destination level
    const siblings =
      channels?.filter((ch) => {
        if (targetParentId === null) {
          return ch.subChannels === undefined || ch.subChannels.length === 0;
        }
        return ch.subChannels?.some((sub) => sub.id === targetParentId);
      }) || [];

    // Remove moved channel and insert at new position
    const updatedChannels = siblings.filter((ch) => ch.id !== draggableId);
    updatedChannels.splice(destination.index, 0, movedChannel);

    // Create updates
    const updates: Partial<Channel>[] = updatedChannels.map((ch, idx) => ({
      id: ch.id,
      order: idx,
      // parentChannelId: targetParentId,
      isCategory: ch.isCategory,
    }));

    // Add moved channel update
    updates.push({
      id: movedChannel.id,
      order: destination.index,
      // parentChannelId: targetParentId,
      isCategory: movedChannel.isCategory,
    });

    emitUpdates(updates);
  };

  return (
    <>
      {/* Current Channel */}
      <div className={styles['currentChannelBox']}>
        <div
          className={`${styles['currentChannelIcon']} ${
            styles[`status${connectStatus}`]
          }`}
        />
        <div className={styles['currentChannelText']}>
          {userCurrentChannelName}
        </div>
      </div>
      {/* Mic Queue */}
      {userCurrentChannel?.voiceMode === 'queue' && (
        <>
          <div className={styles['sectionTitle']}>麥序</div>
          <div className={styles['micQueueBox']}>
            <div className={styles['userList']}>
              {/* {micQueueUsers.map((user) => (
            <UserTab
              key={user.id}
              user={user}
              server={server}
              mainUser={user}
            />
          ))} */}
            </div>
          </div>
        </>
      )}

      {/* Saperator */}
      <div className={styles['saperator-2']} />
      {/* All Channels */}
      <div
        className={styles['sectionTitle']}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          contextMenu.showContextMenu(e.pageX, e.pageY, [
            {
              id: 'addChannel',
              icon: <Plus size={14} className="w-5 h-5 mr-2" />,
              label: '新增',
              show: canEdit,
              onClick: () => ipcService.popup.open('create-channel', 400, 300),
            },
          ]);
        }}
      >
        所有頻道
      </div>
      {/* Channel List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable
          droppableId="root"
          type="CHANNEL" // Always accept CHANNEL type items
          ignoreContainerClipping={true}
          isDropDisabled={!canEdit}
          isCombineEnabled={true}
        >
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={styles['channelList']}
            >
              {serverChannels
                .filter((c) => c.isRoot)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((channel, index) =>
                  channel.isCategory ? (
                    <CategoryTab
                      key={channel.id}
                      category={channel}
                      server={server}
                      canEdit={canEdit}
                      index={index}
                    />
                  ) : (
                    <ChannelTab
                      key={channel.id}
                      channel={channel}
                      server={server}
                      canEdit={canEdit}
                      index={index}
                    />
                  ),
                )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
};

ChannelViewer.displayName = 'ChannelViewer';

export default ChannelViewer;
