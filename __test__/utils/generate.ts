import { UserPostRequestDTO } from '../../src/dto/UserPostRequestDTO';
import { UserResponseDTO } from '../../src/dto/UserResponseDTO';
import { User } from '../../src/entity/User';

/**
 * Generates a mock of user input.
 *
 * @returns An object with the mocked data.
 */
export const userInput = () => {
  const input = {
    email: 'orion@email.com',
    password: '12345678aA!',
    confirmPassword: '12345678aA!'
  };

  return input;
};

/**
 * Generates a mock of user post request.
 *
 * @returns A UserPostRequestDTO with the mocked data.
 */
export const userPostRequest = () => {
  const userPostRequest: UserPostRequestDTO = {
    email: 'orion@email.com',
    password: '12345678aA!'
  };

  return userPostRequest;
};

/**
 * Generates a mock of user payload.
 *
 * @returns A UserResponseDTO with the mocked data.
 */
export const userPayload = () => {
  const user: User = {
    id: 1,
    email: 'orion@email.com',
    password: '12345678aA!',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: new Date()
  };

  return new UserResponseDTO(user);
};