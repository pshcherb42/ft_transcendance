import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';

@Controller('oauth')
export class OAuthController {
  @Get('login')
  @UseGuards(AuthGuard('oauth'))
  login() {
    return;
  }

  @Get('callback')
  @UseGuards(AuthGuard('oauth'))
  callback(@Req() req: Request, @Res() res: Response) {
    const user = req.user;

    if (!user) {
      return res.redirect('/auth/failure');
    }

    return res.redirect('/auth/success');
  }
}
