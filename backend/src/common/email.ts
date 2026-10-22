import { Transform } from 'class-transformer';

// Почта — идентификатор входа, и сравнивается она без учёта регистра.
//
// Раньше адрес хранился и искался как введён. Телефон сам ставит заглавную
// первую букву, поэтому «Farm@mail.uz» при регистрации и «farm@mail.uz» при
// входе давали «неверный пароль», а на один почтовый ящик можно было завести
// два аккаунта. Почтовые серверы регистр в имени ящика не различают — значит,
// и мы не должны.
export function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

// Для DTO: срабатывает до проверки формата, так что и пробел, прилетевший из
// автозаполнения, больше не превращается в «email must be an email».
export const NormalizeEmail = () => Transform(({ value }) => normalizeEmail(value));
