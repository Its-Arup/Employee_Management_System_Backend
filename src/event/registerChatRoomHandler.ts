import { Socket } from 'socket.io';
import { logger } from '../util';

export function registerMessageHandler(socket: Socket) {
    socket.on('joinChatRoom', (roomId: string) => {
        void socket.join(roomId);
        logger.info('Socket joined room', { meta: { socketId: socket.id, roomId } });
    });

    socket.on('leaveChatRoom', (roomId: string) => {
        void socket.leave(roomId);
        logger.info('Socket left room', { meta: { socketId: socket.id, roomId } });
    });
}
