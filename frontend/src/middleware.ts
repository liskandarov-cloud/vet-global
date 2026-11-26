import { NextResponse, type NextRequest } from 'next/server';

// Языковые версии в адресе. Русская — без префикса (внутри это маршрут /ru/…),
// узбекская — /uz/…. У каждой своя запись в кэше страниц и свои метаданные,
// поэтому поисковики видят узбекскую версию как отдельную.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();

  // /ru/… — не канонический адрес русской версии.
  if (pathname === '/ru' || pathname.startsWith('/ru/')) {
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }
  if (pathname === '/uz' || pathname.startsWith('/uz/')) return NextResponse.next();

  // Выбравшего узбекский (cookie ставит сайт) — на узбекскую версию. У ботов
  // cookie нет: они получают русскую страницу по этому адресу.
  if (req.cookies.get('vg_lang')?.value === 'uz') {
    url.pathname = `/uz${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url, 307);
  }
  url.pathname = `/ru${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Мимо: служебное Next, файлы с расширением и метаданные сайта.
  matcher: ['/((?!_next/|api/|__version|sitemap.xml|robots.txt|manifest.webmanifest|.*\\..*).*)'],
};
