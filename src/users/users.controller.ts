import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ProfileStatusResponseDto } from './dto/profile-status-response.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { PaginationResponse } from '../common/dto/paginated-response.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieve a paginated list of all users with their roles and organizations. Supports filtering by role_id and search (name, email, phone).',
  })
  @ApiQuery({
    name: 'role_id',
    required: false,
    type: Number,
    description: 'Filter users by role ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, email, or phone number',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        records: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserResponseDto' },
        },
        page: { type: 'number', example: 1 },
        size: { type: 'number', example: 20 },
        count: { type: 'number', example: 100 },
        pages: { type: 'number', example: 5 },
      },
    },
  })
  async findAll(
    @Query() query: UsersQueryDto,
  ): Promise<PaginationResponse<UserResponseDto>> {
    return await this.service.findAll(query.page, query.size, {
      roleId: query.role_id,
      search: query.search,
    });
  }

  @Get('user/:user_id/profile-status')
  @ApiOperation({
    summary: 'Check profile completion status',
    description:
      'Returns whether a user has set a real name and non-default role. Useful after OTP login where the name defaults to the phone number.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile status retrieved successfully',
    type: ProfileStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfileStatus(
    @Param('user_id', ParseIntPipe) userId: number,
  ): Promise<ProfileStatusResponseDto> {
    return await this.service.checkProfileStatus(userId);
  }

  @Get('user/:user_id')
  @ApiOperation({
    summary: 'Get a user by ID',
    description: 'Retrieve a specific user by their unique identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(
    @Param('user_id', ParseIntPipe) userId: number,
  ): Promise<UserResponseDto> {
    return await this.service.findById(userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user with the provided data',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Role or organization not found',
  })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return await this.service.create(dto);
  }

  @Patch('user/:user_id')
  @ApiOperation({
    summary: 'Update a user',
    description: 'Update an existing user by their ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'User, role, or organization not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or msisdn already in use by another account',
  })
  async update(
    @Param('user_id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.service.update(userId, dto);
  }

  @Delete('user/:user_id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Permanently delete a user by their ID',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async remove(@Param('user_id', ParseIntPipe) userId: number): Promise<void> {
    return await this.service.remove(userId);
  }
}
