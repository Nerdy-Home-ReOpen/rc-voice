/* eslint-disable @next/next/no-img-element */
import React, { useLayoutEffect, useRef } from 'react';

// CSS
import styles from '@/styles/messageViewer.module.css';
import permission from '@/styles/common/permission.module.css';

// Components
import MarkdownViewer from '@/components/viewers/MarkdownViewer';

// Types
import type { ChannelMessage, DirectMessage, InfoMessage } from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';

interface DirectMessageTabProps {
  messageGroup: DirectMessage & {
    contents: string[];
  };
}

const DirectMessageTab: React.FC<DirectMessageTabProps> = React.memo(
  ({ messageGroup }) => {
    // Hooks
    const lang = useLanguage();

    // Variables
    const {
      gender: senderGender,
      name: senderName,
      contents: messageContents,
      timestamp: messageTimestamp,
    } = messageGroup;
    const timestamp = lang.getFormatTimestamp(messageTimestamp);

    return (
      <>
        <div />
        <div className={styles['messageBox']}>
          <div className={styles['header']}>
            <span className={styles['name']}>{senderName}</span>
            <span className={styles['timestamp']}>{timestamp}</span>
          </div>
          {messageContents.map((content, index) => (
            <div key={index} className={styles['content']}>
              <MarkdownViewer markdownText={content} />
            </div>
          ))}
        </div>
      </>
    );
  },
);

DirectMessageTab.displayName = 'DirectMessageTab';

interface ChannelMessageTabProps {
  messageGroup: ChannelMessage & {
    contents: string[];
  };
}

const ChannelMessageTab: React.FC<ChannelMessageTabProps> = React.memo(
  ({ messageGroup }) => {
    // Hooks
    const lang = useLanguage();

    // Variables
    const {
      gender: senderGender,
      name: senderName,
      permissionLevel: messagePermission,
      contents: messageContents,
      timestamp: messageTimestamp,
    } = messageGroup;
    const timestamp = lang.getFormatTimestamp(messageTimestamp);

    return (
      <>
        <div
          className={`${styles['senderIcon']} ${permission[senderGender]} ${
            permission[`lv-${messagePermission}`]
          }`}
        />
        <div className={styles['messageBox']}>
          <div className={styles['header']}>
            <span className={styles['name']}>{senderName}</span>
            <span className={styles['timestamp']}>{timestamp}</span>
          </div>
          {messageContents.map((content, index) => (
            <div key={index} className={styles['content']}>
              <MarkdownViewer markdownText={content} />
            </div>
          ))}
        </div>
      </>
    );
  },
);

ChannelMessageTab.displayName = 'ChannelMessageTab';

interface InfoMessageTabProps {
  messageGroup: InfoMessage & {
    contents: string[];
  };
}

const InfoMessageTab: React.FC<InfoMessageTabProps> = React.memo(
  ({ messageGroup }) => {
    // Variables
    const { contents: messageContents } = messageGroup;

    return (
      <>
        <div className={styles['infoIcon']} />
        <div className={styles['messageBox']}>
          {messageContents.map((content, index) => (
            <div key={index} className="break-words">
              <MarkdownViewer markdownText={content} />
            </div>
          ))}
        </div>
      </>
    );
  },
);

InfoMessageTab.displayName = 'InfoMessageTab';

type MessageGroup = (DirectMessage | ChannelMessage | InfoMessage) & {
  contents: string[];
};

interface MessageViewerProps {
  messages: DirectMessage[] | ChannelMessage[] | InfoMessage[];
}

const MessageViewer: React.FC<MessageViewerProps> = React.memo(
  ({ messages }) => {
    // Variables
    const sortedMessages = [...messages].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    const messageGroups = sortedMessages.reduce<MessageGroup[]>(
      (acc, message) => {
        const lastGroup = acc[acc.length - 1];
        const timeDiff = lastGroup && message.timestamp - lastGroup.timestamp;
        const nearTime = lastGroup && timeDiff <= 5 * 60 * 1000;
        const sameSender = lastGroup && message.senderId === lastGroup.senderId;
        const sameType = lastGroup && message.type === lastGroup.type;
        const isInfo = message.type === 'info';

        if (sameSender && nearTime && sameType && !isInfo) {
          lastGroup.contents.push(message.content);
        } else {
          acc.push({
            ...message,
            contents: [message.content],
          });
        }
        return acc;
      },
      [],
    );

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Effects
    useLayoutEffect(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
    }, [messageGroups]);

    return (
      <div className={styles['messageViewerWrapper']}>
        {messageGroups.map((messageGroup) => {
          return (
            <div key={messageGroup.id} className={styles['messageWrapper']}>
              {messageGroup.type === 'info' ? (
                <InfoMessageTab messageGroup={messageGroup} />
              ) : messageGroup.type === 'general' ? (
                <ChannelMessageTab messageGroup={messageGroup} />
              ) : messageGroup.type === 'dm' ? (
                <DirectMessageTab messageGroup={messageGroup} />
              ) : null}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    );
  },
);

MessageViewer.displayName = 'MessageViewer';

export default MessageViewer;
