import { Server, Socket } from 'socket.io';
import { registerMessageHandler } from './event';
import { allowList } from './config';
import { app } from './app';
import { logger } from './util';

export const io = new Server(app, {
    cors: {
        methods: ['GET', 'POST'],
        origin: allowList,
        credentials: true
    }
});

export function onConnection(socket: Socket) {
    logger.info('Connected', { meta: { socketId: socket.id } });

    socket.on('disconnect', () => {
        logger.info('Disconnected', { meta: { socketId: socket.id } });
    });

    registerMessageHandler(socket);
}
