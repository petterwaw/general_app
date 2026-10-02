import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { GameWithParticipants } from './game.view';

// One committed game state. departedIds are participants the action deleted (removed or left
// the lobby): they are no longer in game.participants, yet their sockets still sit in their
// participant rooms.
export type GameUpdate = {
  game: GameWithParticipants;
  departedIds: string[];
};

// Committed game states: GameService publishes them, GameGateway pushes them to sockets.
// Sits between the two, so the service knows nothing about sockets and there is no
// dependency cycle (the gateway already depends on the service).
@Injectable()
export class GameUpdates {
  private readonly updates = new Subject<GameUpdate>();

  readonly changes$ = this.updates.asObservable();

  publish(update: GameUpdate) {
    this.updates.next(update);
  }
}
