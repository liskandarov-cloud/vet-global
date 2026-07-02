import { SetMetadata } from '@nestjs/common';

// Marks a route as public — skips JwtAuthGuard when applied globally/at controller level.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
