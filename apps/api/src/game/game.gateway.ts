import {
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io'
import { Logger, UseFilters } from '@nestjs/common'
import { GameService } from './game.service';
import { ZodValidationPipe } from '../utils/zod-validation.pipe';
import { subscribeSchema, type SubscribeInput } from '@dice-app/contracts';
import { WsExceptionFilter } from '../utils/ws-exception.filter'

@UseFilters(new WsExceptionFilter)
@WebSocketGateway()

export class GameGateway {

    private readonly logger = new Logger(GameGateway.name)
    constructor(private readonly gameService: GameService) { }

    handleConnection(client: Socket){
        this.logger.log(`\Connected: ${client.id}`)
    }
    handleDisconnect(client: Socket){
        this.logger.log(`\Disconnected: ${client.id}`)
    }

    @SubscribeMessage('subscribe')
    async SubscribeGame(
        @MessageBody(new ZodValidationPipe(subscribeSchema)) {gameId, revision}: SubscribeInput,
        @ConnectedSocket() client: Socket
    ) {
        await client.join(`game:${gameId}`)
        const game = await this.gameService.findOne(gameId, undefined)
        if (game.revision > revision) {
            client.emit('game', game)
        }
    }
}



