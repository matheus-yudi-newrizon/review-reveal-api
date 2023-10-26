import { User } from '../entity/User';

export class UserResponseDTO {
  id: number;
  email: string;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
  }
}