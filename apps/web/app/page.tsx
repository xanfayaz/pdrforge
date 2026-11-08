import { DIRECTIONS } from '@pdrforge/shared';
import Link from 'next/link';
import { DemoButton } from '@/components/demo-button';
import { IosInstallHint } from '@/components/ios-install-hint';
import { Logo } from '@/components/logo';

const benefits: Array<[string, string]> = [
  ['Схема кузова', 'Элемент выбирается на чертеже и сразу попадает в состав заявки.'],
  ['Конструктор PDR', 'Круг, овал и полоса считаются отдельно: точки, матрица и коэффициенты.'],
  ['План поста', 'Дата, время, длительность и мастер видны на неделе.'],
  ['Документы', 'Заказ-наряд и акт с реквизитами, таблицей работ и подписями.'],
  ['Гараж и долги', 'У клиента несколько машин, у заявки — оплаты и остаток.'],
  ['Цифры мастерской', 'Направления, средний чек, загрузка, расходы и Excel.'],
];

const plans: Array<[string, string, string[]]> = [
  ['Искра', 'Один пост', ['Заявки и клиенты', 'Конструктор PDR', 'Схема кузова']],
  ['Горн', 'Мастерская', ['Команда и роли', 'PDF и оплаты', 'Аналитика']],
  ['Контур', 'Несколько постов', ['Выезд мастера', 'Свои направления', 'Экспорт Excel']],
];

const faqs: Array<[string, string]> = [
  ['Нужна ли регистрация?', 'Нет. Кнопка «Войти как демо» открывает готовую мастерскую с клиентами и заявками.'],
  ['Это боевые платежи?', 'Нет. Тарифы показывают будущую сетку и ничего не списывают.'],
  ['Конструктор обязателен для каждой работы?', 'Нет. Для PDR он открывается отдельно. Остальные направления берутся из каталога или вводятся своей ценой.'],
  ['Где лежат данные?', 'В локальном PostgreSQL на этом компьютере. Демо создаётся при первом запуске API.'],
  ['Можно ли потом сделать приложение?', 'Да. Кабинет ходит в REST API с Bearer-токеном, его сможет использовать клиент на Expo.'],
  ['Как открыть на iPhone как приложение?', 'В Safari нажмите «Поделиться», затем «На экран „Домой“». Ярлык открывает кабинет на весь экран, без адресной строки.'],
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-[max(5rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between gap-3 py-6">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-[#b7c2d0]">
            Кабинет
          </Link>
          <DemoButton className="hidden sm:block" />
        </div>
      </header>

      <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-[#ff7a2f]/40 bg-[#ff7a2f]/10 px-3 py-1 text-sm text-[#ffc7a3]">
            10 дней бесплатно
            <span className="text-[#8b97a8]">полный сценарий на демо-данных</span>
          </div>
          <h1 className="mt-5 font-display text-4xl leading-tight md:text-6xl">
            Вмятина получает цену раньше, чем мастер берёт крючок
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[#b7c2d0]">
            PDRForge ведёт заявку от чертежа кузова до акта: конструктор повреждений, загрузка постов, оплаты и документы в одном тёмном кабинете.
          </p>
          <IosInstallHint className="mt-6" />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <DemoButton variant="accent">Войти как демо</DemoButton>
            <a href="#plans" className="rounded-lg border border-white/10 px-4 py-3 text-sm">
              Смотреть тарифы
            </a>
          </div>
        </div>
        <aside className="panel p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[#8b97a8]">Расчёт · капот</div>
          <div className="mt-3 font-display text-2xl">Овал 48×32 мм</div>
          <dl className="mt-4 space-y-2 text-sm text-[#c5ceda]">
            <Row k="Эквивалентный диаметр" v="39,2 мм" />
            <Row k="База по точкам" v="3 340 ₽" />
            <Row k="Класс D × 1,15" v="3 840 ₽" />
            <Row k="Округление до 50 ₽" v="3 850 ₽" />
            <Row k="Арматура, подкрылок" v="700 ₽" />
          </dl>
          <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
            <span className="text-sm text-[#8b97a8]">Позиция в заявке</span>
            <span className="num font-display text-3xl text-[#ffb07a]">4 550 ₽</span>
          </div>
        </aside>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {benefits.map(([title, text]) => (
          <article key={title} className="panel p-5">
            <h2 className="font-display text-lg">{title}</h2>
            <p className="mt-2 text-sm text-[#9aa6b5]">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Направления работ</h2>
        <p className="mt-2 max-w-2xl text-[#9aa6b5]">
          В кабинете включаются нужные посты. Своё направление добавляется рядом с девятью готовыми.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DIRECTIONS.map((item) => (
            <div key={item.code} className="rounded-2xl border border-white/10 px-4 py-3">
              <div className="text-sm text-white">{item.name}</div>
            </div>
          ))}
          <div className="rounded-2xl border border-dashed border-[#3c8dff]/50 px-4 py-3 text-sm text-[#9ec4ff]">
            Своё направление
          </div>
        </div>
      </section>

      <section id="plans" className="mt-14">
        <h2 className="font-display text-3xl">Тарифы</h2>
        <p className="mt-2 text-[#9aa6b5]">Демо-сетка. Кнопки не проводят оплату и не просят карту.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {plans.map(([name, note, items], index) => (
            <article key={name} className={index === 1 ? 'panel border-[#ff7a2f]/50 p-5' : 'panel p-5'}>
              <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">{note}</div>
              <h3 className="mt-2 font-display text-2xl">{name}</h3>
              <div className="num mt-3 text-3xl">0 ₽</div>
              <ul className="mt-4 space-y-2 text-sm text-[#c5ceda]">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <DemoButton className="mt-5" variant={index === 1 ? 'accent' : 'outline'}>
                Открыть демо
              </DemoButton>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Вопросы</h2>
        <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
          {faqs.map(([question, answer]) => (
            <details key={question} className="px-4 py-3">
              <summary className="cursor-pointer font-medium">{question}</summary>
              <p className="mt-2 text-sm text-[#9aa6b5]">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-[#8b97a8]">
        <span>PDRForge · локальная CRM для мастерской</span>
        <Link href="/login">Перейти в кабинет</Link>
      </footer>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{k}</dt>
      <dd className="num text-white">{v}</dd>
    </div>
  );
}
