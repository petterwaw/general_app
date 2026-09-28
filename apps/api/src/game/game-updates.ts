import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { GameWithParticipants } from './game.view';

// Committed game states: GameService publishes them, GameGateway pushes them to sockets.
// Sits between the two, so the service knows nothing about sockets and there is no
// dependency cycle (the gateway already depends on the service).
@Injectable()
export class GameUpdates {
  private readonly updates = new Subject<GameWithParticipants>();

  readonly changes$ = this.updates.asObservable();

  publish(game: GameWithParticipants) {
    this.updates.next(game);
  }
}
