import { electronService } from './electron.service';

export type SocketEventData = {
  type:
    | 'connect'
    | 'disconnect'
    | 'error'
    | 'message'
    | 'serverUpdate'
    | 'userUpdate';
  payload?: any;
  error?: string;
};

export const ipcService = {
  sendToMain: (channel: string, data: any) => {
    electronService.sendToMain(channel, data);
  },

  onFromMain: (channel: string, callback: (data: any) => void) => {
    electronService.onFromMain(channel, callback);
  },

  removeListener: (channel: string) => {
    electronService.removeListener(channel);
  },
};

export const SOCKET_IPC_CHANNEL = 'socket-event';
