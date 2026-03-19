import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';
import type { SignupDto } from './dto/signup.dto';
import type { UpdatePasswordDto } from './dto/update-password.dto';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/reset-password.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  AuthResponseDto,
  CurrentUserResponseDto,
} from './dto/auth-response.dto';
import type { RequestOtpDto } from './dto/request-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Public } from './guards/public.decorator';
import { Open } from './guards/open.decorator';
import { GoogleAuthGuard } from './guards';
import { User } from '../common/decorators/user.decorator';
import type { AuthorizedUser } from '../common/types/authenticated-request';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OkResponseDto } from '@/common/dto';
import { FRONTEND_AUTH_CALLBACK_URL } from '../common/constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Signup a new user' })
  @ApiResponse({
    status: 201,
    description: 'User signed up successfully',
    type: AuthResponseDto,
  })
  async signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return await this.authService.signup(dto);
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: AuthResponseDto,
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return await this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully',
    type: AuthResponseDto,
  })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return await this.authService.refreshAccessToken(dto);
  }

  @Patch('password/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user password' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    type: OkResponseDto,
  })
  async updatePassword(
    @User() user: AuthorizedUser,
    @Body() dto: UpdatePasswordDto,
  ): Promise<OkResponseDto> {
    await this.authService.updatePassword(user.userId, user.accountId, dto);
    return { message: 'Password updated successfully' };
  }

  @Public()
  @Throttle({ long: { limit: 3, ttl: 3_600_000 } })
  @Post('password/reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset request sent successfully',
    type: OkResponseDto,
  })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<OkResponseDto> {
    return await this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Patch('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a user password' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: OkResponseDto,
  })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<OkResponseDto> {
    return await this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({ long: { limit: 3, ttl: 600_000 } })
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an OTP for login' })
  @ApiResponse({
    status: 200,
    description: 'OTP request processed successfully',
    type: OkResponseDto,
  })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<OkResponseDto> {
    return await this.authService.requestOtp(dto);
  }

  @Public()
  @Throttle({ long: { limit: 3, ttl: 600_000 } })
  @Post('otp/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP, invalidating the existing one' })
  @ApiResponse({
    status: 200,
    description: 'OTP resend processed successfully',
    type: OkResponseDto,
  })
  async resendOtp(@Body() dto: RequestOtpDto): Promise<OkResponseDto> {
    return await this.authService.resendOtp(dto);
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 600_000 } })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, user logged in',
    type: AuthResponseDto,
  })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return await this.authService.verifyOtp(dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current authenticated user and account details',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user and account details retrieved successfully',
    type: CurrentUserResponseDto,
  })
  async getCurrentUser(
    @User() user: AuthorizedUser,
  ): Promise<CurrentUserResponseDto> {
    return await this.authService.getCurrentUser(user.userId, user.accountId);
  }

  @Get('google')
  @Open()
  @SkipThrottle()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleLogin(): Promise<void> {
    // Passport handles the redirect to Google
  }

  @Get('google/callback')
  @Open()
  @SkipThrottle()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback — redirects to frontend' })
  googleCallback(
    @Req() req: Request & { user: AuthResponseDto },
    @Res() res: Response,
  ): void {
    const { accessToken, refreshToken } = req.user;
    const fragment = `accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;
    res.redirect(`${FRONTEND_AUTH_CALLBACK_URL}#${fragment}`);
  }
}
