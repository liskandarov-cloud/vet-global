import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  // commit — какой код реально работает. При неудачной выкатке Render
  // оставляет прежний контейнер, и health отвечал 200 со старого кода: так
  // незамеченными прошли восемь упавших деплоев. Uptime сверяет его с main.
  // RENDER_GIT_COMMIT Render подставляет сам; вне Render поля нет.
  @Get('health')
  health() {
    const commit = process.env.RENDER_GIT_COMMIT?.slice(0, 12);
    return { status: 'ok', service: 'vetglobal-api', time: new Date().toISOString(), ...(commit ? { commit } : {}) };
  }
}
