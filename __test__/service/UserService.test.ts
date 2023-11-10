import { Container } from 'typedi';
import { LoginResponseDTO } from '../../src/dto/LoginResponseDTO';
import { UserResponseDTO } from '../../src/dto/UserResponseDTO';
import { Token } from '../../src/entity/Token';
import { User } from '../../src/entity/User';
import { DatabaseOperationFailException, SendEmailFailException, UserAlreadyExistsException } from '../../src/exception';
import { AuthenticationFailedException } from '../../src/exception/AuthenticationFailedException';
import { IUserPostRequest } from '../../src/interface/IUserPostRequest';
import { TokenRepository } from '../../src/repository/TokenRepository';
import { UserRepository } from '../../src/repository/UserRepository';
import { JwtService } from '../../src/security/JwtService';
import { PasswordEncrypt } from '../../src/security/PasswordEncrypt';
import { UserService } from '../../src/service/UserService';
import { EmailService } from '../../src/utils/EmailService';
import { Generate } from '../mocks/Generate';

const userService = Container.get(UserService);
const userRepository = Container.get(UserRepository);
const tokenRepository = Container.get(TokenRepository);

const generate = new Generate();

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user', async () => {
      const user: User = generate.userData();
      const userPostRequest: IUserPostRequest = generate.userPostRequest();
      const userResponse: UserResponseDTO = generate.userPayload();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(null);
      const spyEncrypt = jest.spyOn(PasswordEncrypt, 'encrypt').mockResolvedValue(userPostRequest.password);
      const spyCreate = jest.spyOn(userRepository, 'create').mockReturnValue(user);
      const spySave = jest.spyOn(userRepository, 'save').mockResolvedValue(user);

      const result: UserResponseDTO = await userService.createUser(userPostRequest);

      expect(result).toEqual(userResponse);
      expect(spyGetByEmail).toHaveBeenCalledWith(userPostRequest.email);
      expect(spyEncrypt).toHaveBeenCalledWith(userPostRequest.password);
      expect(spyCreate).toHaveBeenCalledWith(userPostRequest);
      expect(spySave).toHaveBeenCalledWith(user);
    });

    it('should throw UserAlreadyExistsException if the user already exists', async () => {
      const user: User = generate.userData();
      const userPostRequest: IUserPostRequest = generate.userPostRequest();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);

      await expect(userService.createUser(userPostRequest)).rejects.toThrow(UserAlreadyExistsException);
      expect(spyGetByEmail).toHaveBeenCalledWith(userPostRequest.email);
    });

    it('should throw DatabaseOperationFailException if operation fails while creating User', async () => {
      const userPostRequest: IUserPostRequest = generate.userPostRequest();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(null);
      const spyEncrypt = jest.spyOn(PasswordEncrypt, 'encrypt').mockResolvedValue(userPostRequest.password);
      const spyCreate = jest.spyOn(userRepository, 'create').mockImplementation(() => {
        throw new DatabaseOperationFailException();
      });

      await expect(userService.createUser(userPostRequest)).rejects.toThrow(DatabaseOperationFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(userPostRequest.email);
      expect(spyEncrypt).toHaveBeenCalledWith(userPostRequest.password);
      expect(spyCreate).toHaveBeenCalledWith(userPostRequest);
    });

    it('should throw DatabaseOperationFailException if operation fails while saving User', async () => {
      const user: User = generate.userData();
      const userPostRequest: IUserPostRequest = generate.userPostRequest();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(null);
      const spyEncrypt = jest.spyOn(PasswordEncrypt, 'encrypt').mockResolvedValue(userPostRequest.password);
      const spyCreate = jest.spyOn(userRepository, 'create').mockReturnValue(user);
      const spySave = jest.spyOn(userRepository, 'save').mockImplementation(() => {
        throw new DatabaseOperationFailException();
      });

      await expect(userService.createUser(userPostRequest)).rejects.toThrow(DatabaseOperationFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(userPostRequest.email);
      expect(spyEncrypt).toHaveBeenCalledWith(userPostRequest.password);
      expect(spyCreate).toHaveBeenCalledWith(userPostRequest);
      expect(spySave).toHaveBeenCalledWith(user);
    });
  });

  describe('login', () => {
    it('should return the login response', async () => {
      const user: User = generate.userData();
      const loginInput = generate.loginInput();
      const userDTO: IUserPostRequest = { email: loginInput.email, password: loginInput.password };
      const jwt = generate.encodedJwt();
      const loginResponse: LoginResponseDTO = generate.loginResponse();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyCompare = jest.spyOn(PasswordEncrypt, 'compare').mockResolvedValue(true);
      const spyGenerateToken = jest.spyOn(JwtService, 'generateToken').mockReturnValue(jwt);

      const result: UserResponseDTO = await userService.login(userDTO, loginInput.rememberMe);

      expect(result).toEqual(loginResponse);
      expect(spyGetByEmail).toHaveBeenCalledWith(userDTO.email);
      expect(spyCompare).toHaveBeenCalledWith(userDTO.password, user.password);
      expect(spyGenerateToken).toHaveBeenCalledWith({ id: user.id, email: user.email }, loginInput.rememberMe ? undefined : '5h');
    });

    it('should throw AuthenticationFailedException if the email is incorrect', async () => {
      const loginInput = generate.loginInput();
      const userDTO: IUserPostRequest = { email: loginInput.email, password: loginInput.password };

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(null);

      await expect(userService.login(userDTO, loginInput.rememberMe)).rejects.toThrow(AuthenticationFailedException);
      expect(spyGetByEmail).toHaveBeenCalledWith(userDTO.email);
    });

    it('should throw AuthenticationFailedException if the password is incorrect', async () => {
      const loginInput = generate.loginInput();
      const userDTO: IUserPostRequest = { email: loginInput.email, password: loginInput.password };
      const user: User = generate.userData();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyCompare = jest.spyOn(PasswordEncrypt, 'compare').mockResolvedValue(false);

      await expect(userService.login(userDTO, loginInput.rememberMe)).rejects.toThrow(AuthenticationFailedException);
      expect(spyGetByEmail).toHaveBeenCalledWith(userDTO.email);
      expect(spyCompare).toHaveBeenCalledWith(userDTO.password, user.password);
    });

    it('should throw DatabaseOperationFailException if the database operation fails', async () => {
      const loginInput = generate.loginInput();
      const userDTO: IUserPostRequest = { email: loginInput.email, password: loginInput.password };

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockImplementation(() => {
        throw new DatabaseOperationFailException();
      });

      await expect(userService.login(userDTO, loginInput.rememberMe)).rejects.toThrow(DatabaseOperationFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(userDTO.email);
    });
  });

  describe('forgotPassword', () => {
    it('should send an email if token is expired', async () => {
      const input = generate.forgotPasswordInput();
      const user: User = generate.userData();
      const expiredToken: Token = generate.expiredTokenData();
      const token: Token = generate.tokenData();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyFindById = jest.spyOn(tokenRepository, 'findById').mockResolvedValue(expiredToken);
      const spyDeleteById = jest.spyOn(tokenRepository, 'deleteById').mockResolvedValue();
      const spyEncrypt = jest.spyOn(PasswordEncrypt, 'encrypt').mockResolvedValue(token.token);
      const spyCreate = jest.spyOn(tokenRepository, 'create').mockReturnValue(token);
      const spySave = jest.spyOn(tokenRepository, 'save').mockResolvedValue(token);
      const spySendEmail = jest.spyOn(EmailService, 'sendEmail').mockResolvedValue();

      await userService.forgotPassword(input.email);

      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
      expect(spyFindById).toHaveBeenCalledWith(user.id);
      expect(spyDeleteById).toHaveBeenCalledWith(expiredToken.id);
      expect(spyEncrypt).toHaveBeenCalled();
      expect(spyCreate).toHaveBeenCalledWith({ user: token.user, token: token.token });
      expect(spySave).toHaveBeenCalledWith(token);
      expect(spySendEmail).toHaveBeenCalled();
    });

    it('should return empty if token is not expired', async () => {
      const input = generate.forgotPasswordInput();
      const user: User = generate.userData();
      const token: Token = generate.tokenData();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyFindById = jest.spyOn(tokenRepository, 'findById').mockResolvedValue(token);

      await userService.forgotPassword(input.email);

      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
      expect(spyFindById).toHaveBeenCalledWith(user.id);
    });

    it('should do nothing if user is not registered', async () => {
      const input = generate.forgotPasswordInput();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(null);

      await userService.forgotPassword(input.email);

      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
    });

    it('should throw DatabaseOperationFailException if operation fails while finding user by email', async () => {
      const input = generate.forgotPasswordInput();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockImplementation(() => {
        throw new DatabaseOperationFailException();
      });

      await expect(userService.forgotPassword(input.email)).rejects.toThrow(DatabaseOperationFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
    });

    it('should throw DatabaseOperationFailException if operation fails while finding token by id', async () => {
      const input = generate.forgotPasswordInput();
      const user: User = generate.userData();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyFindById = jest.spyOn(tokenRepository, 'findById').mockImplementation(() => {
        throw new DatabaseOperationFailException();
      });

      await expect(userService.forgotPassword(input.email)).rejects.toThrow(DatabaseOperationFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
      expect(spyFindById).toHaveBeenCalledWith(user.id);
    });

    it('should throw DatabaseOperationFailException if operation fails while deleting token by id', async () => {
      const input = generate.forgotPasswordInput();
      const user: User = generate.userData();
      const expiredToken: Token = generate.expiredTokenData();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyFindById = jest.spyOn(tokenRepository, 'findById').mockResolvedValue(expiredToken);
      const spyDeleteById = jest.spyOn(tokenRepository, 'deleteById').mockImplementation(() => {
        throw new DatabaseOperationFailException();
      });

      await expect(userService.forgotPassword(input.email)).rejects.toThrow(DatabaseOperationFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
      expect(spyFindById).toHaveBeenCalledWith(user.id);
      expect(spyDeleteById).toHaveBeenCalledWith(expiredToken.id);
    });

    it('should throw DatabaseOperationFailException if operation fails while creating token', async () => {
      const input = generate.forgotPasswordInput();
      const user: User = generate.userData();
      const expiredToken: Token = generate.expiredTokenData();
      const token: Token = generate.tokenData();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyFindById = jest.spyOn(tokenRepository, 'findById').mockResolvedValue(expiredToken);
      const spyDeleteById = jest.spyOn(tokenRepository, 'deleteById').mockResolvedValue();
      const spyEncrypt = jest.spyOn(PasswordEncrypt, 'encrypt').mockResolvedValue(token.token);
      const spyCreate = jest.spyOn(tokenRepository, 'create').mockImplementation(() => {
        throw new DatabaseOperationFailException();
      });

      await expect(userService.forgotPassword(input.email)).rejects.toThrow(DatabaseOperationFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
      expect(spyFindById).toHaveBeenCalledWith(user.id);
      expect(spyDeleteById).toHaveBeenCalledWith(expiredToken.id);
      expect(spyEncrypt).toHaveBeenCalled();
      expect(spyCreate).toHaveBeenCalledWith({ user: token.user, token: token.token });
    });

    it('should throw DatabaseOperationFailException if operation fails while saving token', async () => {
      const input = generate.forgotPasswordInput();
      const user: User = generate.userData();
      const expiredToken: Token = generate.expiredTokenData();
      const token: Token = generate.tokenData();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyFindById = jest.spyOn(tokenRepository, 'findById').mockResolvedValue(expiredToken);
      const spyDeleteById = jest.spyOn(tokenRepository, 'deleteById').mockResolvedValue();
      const spyEncrypt = jest.spyOn(PasswordEncrypt, 'encrypt').mockResolvedValue(token.token);
      const spyCreate = jest.spyOn(tokenRepository, 'create').mockReturnValue(token);
      const spySave = jest.spyOn(tokenRepository, 'save').mockImplementation(() => {
        throw new DatabaseOperationFailException();
      });

      await expect(userService.forgotPassword(input.email)).rejects.toThrow(DatabaseOperationFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
      expect(spyFindById).toHaveBeenCalledWith(user.id);
      expect(spyDeleteById).toHaveBeenCalledWith(expiredToken.id);
      expect(spyEncrypt).toHaveBeenCalled();
      expect(spyCreate).toHaveBeenCalledWith({ user: token.user, token: token.token });
      expect(spySave).toHaveBeenCalledWith(token);
    });

    it('should throw SendEmailFailException if there is a failure sending email', async () => {
      const input = generate.forgotPasswordInput();
      const user: User = generate.userData();
      const expiredToken: Token = generate.expiredTokenData();
      const token: Token = generate.tokenData();

      const spyGetByEmail = jest.spyOn(userRepository, 'getByEmail').mockResolvedValue(user);
      const spyFindById = jest.spyOn(tokenRepository, 'findById').mockResolvedValue(expiredToken);
      const spyDeleteById = jest.spyOn(tokenRepository, 'deleteById').mockResolvedValue();
      const spyEncrypt = jest.spyOn(PasswordEncrypt, 'encrypt').mockResolvedValue(token.token);
      const spyCreate = jest.spyOn(tokenRepository, 'create').mockReturnValue(token);
      const spySave = jest.spyOn(tokenRepository, 'save').mockResolvedValue(token);
      const spySendEmail = jest.spyOn(EmailService, 'sendEmail').mockImplementation(() => {
        throw new SendEmailFailException('Failure sending email.');
      });

      await expect(userService.forgotPassword(input.email)).rejects.toThrow(SendEmailFailException);
      expect(spyGetByEmail).toHaveBeenCalledWith(input.email);
      expect(spyFindById).toHaveBeenCalledWith(user.id);
      expect(spyDeleteById).toHaveBeenCalledWith(expiredToken.id);
      expect(spyEncrypt).toHaveBeenCalled();
      expect(spyCreate).toHaveBeenCalledWith({ user: token.user, token: token.token });
      expect(spySave).toHaveBeenCalledWith(token);
      expect(spySendEmail).toHaveBeenCalled();
    });
  });
});
