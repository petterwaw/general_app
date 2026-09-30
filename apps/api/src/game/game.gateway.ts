import {
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    ConnectedSocket,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io'
import { Logger, UseFilters } from '@nestjs/common'
import { GameService } from './game.service';
import { ZodValidationPipe } from '../utils/zod-validation.pipe';
import { subscribeSchema, type SubscribeInput } from '@dice-app/contracts';
import { WsExceptionFilter } from '../utils/ws-exception.filter'
import { hostSecretFromCookieHeader } from '../utils/host-cookie';
import { GameUpdates } from './game-updates';
import { hostParticipantId, toGameView } from './game.view'

@UseFilters(new WsExceptionFilter)
@WebSocketGateway()

export class GameGateway {

    private readonly logger = new Logger(GameGateway.name)

    @WebSocketServer() server!: Server

    constructor(
        private readonly gameService: GameService,
        private readonly updates: GameUpdates,
    ) { }

    // Called by Nest once the Socket.IO server exists; from then on every committed game
    // state goes out to the game's rooms.
    afterInit() {
        this.updates.changes$.subscribe((game) => {

            this.server.to(`game:${game.id}:host`).emit('game', toGameView(game, true, hostParticipantId(game)))
            this.server.to(`game:${game.id}:viewer`).emit('game', toGameView(game, false, null))
        })
    }

    handleConnection(client: Socket){
        this.logger.log(`Connected: ${client.id}`)
    }
    handleDisconnect(client: Socket){
        this.logger.log(`Disconnected: ${client.id}`)
    }

    @SubscribeMessage('subscribe')
    async SubscribeGame(
        @MessageBody(new ZodValidationPipe(subscribeSchema)) {gameId, revision}: SubscribeInput,
        @ConnectedSocket() client: Socket
    ) {
        const hostSecret = hostSecretFromCookieHeader(client.handshake.headers.cookie)
        // The role is settled before joining: a room is picked once, and the host never changes.
        const isHost = await this.gameService.isHost(gameId, hostSecret)

        // Exactly one room per socket; joined before findOne, so no update can slip in between.
        if (isHost) {
            await client.join(`game:${gameId}:host`)
        } else {
            await client.join(`game:${gameId}:viewer`)
        }
        

        const game = await this.gameService.findOne(gameId, hostSecret)
        if (game.revision > revision) {
            client.emit('game', game)
        }
    }
}




