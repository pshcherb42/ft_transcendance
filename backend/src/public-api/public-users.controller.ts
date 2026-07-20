import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
  } from '@nestjs/common';
  import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
  import {
    ApiTags,
    ApiSecurity,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
  } from '@nestjs/swagger';
  import { ApiKeyGuard } from '../common/guards/api-key.guard';
  import { PublicUsersService } from './public-users.service';
  import { CreatePublicUserDto } from './dto/create-public-user.dto';
  import { UpdatePublicUserDto } from './dto/update-public-user.dto';
  import { PublicUserResponseDto } from './dto/public-user-response.dto';
  
  @ApiTags('Public API - Users')
  @ApiSecurity('API-KEY')
  @UseGuards(ThrottlerGuard, ApiKeyGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 req/min, stricter than any global default
  @Controller('api/public/users')
  export class PublicUsersController {
    constructor(private readonly service: PublicUsersService) {}
  
    @Get()
    @ApiOperation({ summary: 'List public user profiles' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiResponse({ status: 200, type: [PublicUserResponseDto] })
    findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
      return this.service.findAll(
        page ? parseInt(page, 10) : undefined,
        limit ? parseInt(limit, 10) : undefined,
      );
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a single public user profile' })
    @ApiParam({ name: 'id', type: String })
    @ApiResponse({ status: 200, type: PublicUserResponseDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id') id: string) {
      return this.service.findOne(id);
    }
  
    @Post()
    @ApiOperation({ summary: 'Create a public profile (no credentials)' })
    @ApiResponse({ status: 201, type: PublicUserResponseDto })
    @ApiResponse({ status: 409, description: 'Email or username taken' })
    create(@Body() dto: CreatePublicUserDto) {
      return this.service.create(dto);
    }
  
    @Put(':id')
    @ApiOperation({ summary: 'Update name/avatar of a public profile' })
    @ApiParam({ name: 'id', type: String })
    @ApiResponse({ status: 200, type: PublicUserResponseDto })
    update(@Param('id') id: string, @Body() dto: UpdatePublicUserDto) {
      return this.service.update(id, dto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user profile' })
    @ApiParam({ name: 'id', type: String })
    @ApiResponse({ status: 200, description: 'Deleted' })
    @ApiResponse({ status: 409, description: 'Blocked by related records' })
    remove(@Param('id') id: string) {
      return this.service.remove(id);
    }
  }


  // define commands