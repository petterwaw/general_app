import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): string {
    return 'Health OK';
  }

  newGame(): string {
    
    return 'New game created, id: {id}'
  }
}
