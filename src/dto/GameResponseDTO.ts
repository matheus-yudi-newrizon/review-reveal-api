import { Game, User } from '../entity';

export class GameResponseDTO {
  lives: number;
  record: number;
  combo: number;
  isActive: boolean;

  constructor(game: Game, user: User) {
    this.lives = game.lives;
    this.record = user.record;
    this.combo = game.combo;
    this.isActive = game.isActive;
  }
}
