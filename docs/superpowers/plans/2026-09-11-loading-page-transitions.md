# Переходы между страницами с заполнением LOADING — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. При явно разрешённой работе субагентов допустим superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking. Пользователь заказал сейчас только план для другой модели; этот документ не означает, что реализация уже выполнена.

**Goal:** При переходе между страницами показывать заполняющийся текст LOADING, связанный с фактической готовностью целевого содержимого, затем без паузы на полностью заполненной надписи плавно раскрывать готовую страницу, сохранив скелетоны.

**Architecture:** Один сохраняющийся координатор переходов над группами маршрутов, чистая модель состояния и отдельная Motion-поверхность. Источники готовности явно сообщают о загрузке маршрута, авторизации, начальных данных, динамического компонента и необходимых для первого отображения ресурсов. Существующий CockpitWorkspace подключается адаптером: его локальные вкладки и история не заменяются обычным router.push.

**Tech Stack:** Установленные Next.js 16.3.1 App Router, React 19.2.8, Motion 13.1.1, TypeScript, Tailwind CSS 4, node:test и Playwright. Новые зависимости не нужны.

**Spec:** Нормативная спецификация находится в разделах 1–5 этого документа. Исполнитель должен прочитать весь документ, включая карту существующего кода, контракты и критерии приёмки.

## Общие ограничения

- Прочитать актуальные `AGENTS.md`, `DESIGN_SYSTEM.md`; считать незакоммиченные изменения частью исходного состояния пользователя.
- Все новые анимации — через `motion/react`. Никаких CSS keyframes, CSS transition или сторонних библиотек для этого перехода.
- Не устанавливать, не обновлять и не удалять npm-пакеты без отдельного явного разрешения.
- Не менять Supabase schema, RLS, SQL, API-контракты хранения и правила авторизации. Меняются только наблюдение за готовностью и представление загрузки.
- Не удалять `CockpitSkeleton.tsx`, его экспорты и fallback динамических компонентов.
- Не переписывать несвязанные страницы и фон. Не сбрасывать состояние калькулятора, фильтров, расширенных представлений и настройки пользователя.
- Не коммитить и не пушить автоматически. Для этой передачи требуется реализация и проверка; публикация — отдельное действие по правилам веток проекта.
- Перед любым отдельно разрешённым push на окончательном состоянии обязательны `npm test` и `npm run test:e2e`; при ошибке push запрещён. Визуальные эталоны без разрешения не обновлять.
- Общаться с пользователем по-русски. В интерфейс не выводить внутренние имена загрузчиков, сетевые URL, идентификаторы задач и технические исключения.

## 1. Зафиксированное поведение

### 1.1. Успешный переход

1. После разрешённого действия навигации новая заставка мягко закрывает текущую страницу. Параллельно допустимо запустить prefetch и загрузку известного динамического модуля.
2. Только после завершения закрытия меняется отображаемый маршрут/локальная вкладка. Новое дерево реально монтируется за непрозрачной заставкой.
3. LOADING заполняется слева направо по завершённым этапам. Между полученными значениями — короткое монотонное сглаживание Motion.
4. Пока есть обязательная незавершённая работа, текст не заполнен полностью. При отсутствии новых событий заполнение останавливается, а не продолжает ползти по таймеру.
5. Когда готова страница, завершено закрытие и разрешено раскрытие, запускается финальное заполнение.
6. **В том же обработчике завершения финального заполнения начинается исчезновение LOADING и появление страницы.** Не добавлять отдельные timeout, минимальное удержание на 100% или фазу «100%, ждём данные».
7. После Motion completion раскрытия убрать заставку, снять блокировку фокуса и восстановить взаимодействие. Новое дерево остаётся тем же, без повторного монтирования.

Начальные параметры: закрытие 160 мс, сглаживание очередного значения 140 мс, финальное заполнение 160 мс, перекрёстное растворение 300 мс. Это длительности визуальных действий, а не сроки загрузки. Значения вынести в один объект. Для полностью закэшированного перехода цикл короткий, без искусственной секунды ожидания.

### 1.2. Что означает прогресс

У Next App Router нет универсального точного процента готовности произвольной страницы. Сетевой поток, выполнение JS, чтение кэша и React commit — разные работы с неизвестной длительностью. Требование реализуется как **взвешенный прогресс реально завершённых этапов**, без заявления о проценте полученных байтов или оставшегося времени.

Предварительно известный план этапов фиксируется при создании перехода. Начальная шкала:

| Этап | Вес | Достоверный сигнал |
|---|---:|---|
| Целевой маршрут | 10 | Смонтирован целевой сегмент; для локальной вкладки выбран нужный activeTab |
| Авторизация | 10 | Соответствующий AuthProvider завершил начальную проверку; доступ разрешён либо выбран окончательный redirect |
| Первичные данные | 40 | Завершены 8 операций `loadInitialData`, по 5 единиц каждая; данные затем подтверждаются commit-сигналом |
| Код представления | 15 | Разрешился loader нужного workspace-компонента; для обычной страницы — смонтировано её представление |
| Готовность интерфейса | 15 | Реальное содержимое закоммичено с нужными данными, завершено восстановление состояния, применена окончательная геометрия оболочки |
| Критичные ресурсы | 10 | Готовы нужные шрифты и изображения первого экрана либо показана стабильная замена при их ошибке |

Для `/login`, `/about`, ошибки и 404 не добавлять отсутствующую загрузку DataProvider: исключить неприменимые этапы из плана до его запуска и нормализовать сумму весов. Уже доступные данные/модули учитываются сразу, повторно не запрашиваются. Для admin готовность пользователей/ключей входит в начальную авторизацию: сейчас `loadProfile` ждёт эти списки перед `isLoading=false`.

Формула: `realProgress = sum(weight * fraction) / sum(weight)`, где fraction меняется только по наблюдаемому событию. До начала финального заполнения визуальная цель ограничивается `0.97`; это резерв завершения, а не имитация дополнительной загрузки. Никакого случайного прироста, асимптотического ползания до 99% и предварительного заполнения до 100%.

Не показывать пользователю числовой процент: достаточно заполнения букв и подписи «Открываем страницу…». Для доступности процент описывается как готовность этапов. Непрерывность между событиями — сглаживание; обещать равномерный рост всю загрузку нельзя.

### 1.3. Область применения

- Переходы между `/`, шестью workspace-разделами, `/settings`, `/admin`, `/about`, `/login`.
- `/profile` — существующий серверный redirect в `/settings?section=profile`, а не самостоятельная готовая страница.
- Первый вход/обновление страницы: после начала работы React тот же координатор ждёт готовности; до гидратации допустима статичная заставка или существующий серверный fallback. Не обещать анимацию до загрузки её JS.
- Back/Forward: тот же контроль готовности, без добавления новой записи истории. Программный popstate уже меняет URL — прикрывать новое содержимое в layout-effect до раскрытия; не имитировать pop дополнительным push.
- Смена вкладки настроек через query, сортировки, фильтры, hash-якоря, повторный клик на текущую страницу, фоновые обновления и открытие модалки сами по себе не запускают полноэкранную загрузку.
- `router.refresh()` без смены страницы не перезапускает переход. Если обновление временно убирает локальные данные, остаётся локальный skeleton.

## 2. Состояние проекта на момент планирования

Рабочее дерево уже содержит много пользовательских изменений, в том числе в RootLayout, AuthGuard, MainNavbar, CockpitWorkspace, SettingsPage, DataProvider-зависимом API и тестах. Перед реализацией повторно прочитать эти файлы: не применять слепые патчи по номерам строк.

На момент подготовки плана общий `git diff --check` уже сообщал о лишней пустой строке в конце `src/shared/ui/CockpitModal.tsx` и `tests/runtime-architecture.test.tsx`; это исходные изменения, не результат реализации LOADING. Не объявлять такие сообщения новой регрессией и не исправлять посторонние файлы только ради плана.

| Файл | Сейчас | Следствие для реализации |
|---|---|---|
| `src/app/layout.tsx` | Серверный async layout, `await connection()`, next/font, постоянный AppBackground | Сохранить серверность и CSP-логику; сюда добавить клиентский координатор вокруг children |
| `src/app/loading.tsx` | Статическая cockpit-загрузка | Одного изменения этого файла недостаточно: fallback исчезает по правилам Suspense |
| `src/app/(protected)/layout.tsx` | AppMotion, Toast, Auth, Data, OrderModal, AuthGuard, PixelCurtain, CockpitTransition | Координатор должен переживать AuthGuard и смену групп маршрутов |
| `src/shared/ui/PixelCurtain.tsx` | Перехват document click в capture и цепочка timeout; переходы с/на `/` | Убрать активный второй механизм переходов; не оставлять capture, обходящий разрешение ухода из настроек |
| `src/shared/ui/CockpitContentTransition.tsx` | Provider заглушка, panel AnimatePresence mode=wait, callback окончания visible | Избавиться от двойной анимации на управляемом переходе; не принять анимацию skeleton за готовность страницы |
| `src/widgets/CockpitWorkspace/CockpitWorkspace.tsx` | Локальный activeTab, dynamic-компоненты, отложенный history.pushState, удержание расширенной оболочки | Нужен адаптер к координатору; нельзя механически заменить вкладки router.push |
| `src/widgets/CockpitWorkspace/workspaceDefinitions.tsx` | 6 loader и соответствующие skeleton; фабрика dynamic | Лучшее место наблюдения за загрузкой кода; сохранить разделение bundle |
| `src/entities/model/loadInitialData.ts` | 8 параллельных операций через Promise.all | Добавить необязательный callback этапов, не превращать операции в последовательные |
| `src/entities/model/DataProvider.tsx` | Общий isLoading; данные применяются после Promise.all | Добавить snapshot первичной загрузки; фоновую синхронизацию не считать переходом |
| `src/shared/ui/AuthGuard.tsx` | Skeleton до auth, redirect для гостя/отсутствия прав | Не скрывать детей условием координатора вместо AuthGuard; сохранить границу доступа |
| `src/shared/lib/usePersistentState.ts` | Читает storage в effect после первого render | Первый mount ещё не означает окончательную геометрию/фильтры |
| `src/app/(protected)/settings/page.tsx` | handleNavigate, диалог сохранения/отмены, pendingHref | Сначала решить уход, затем показывать LOADING; отмена не меняет URL |
| `scripts/test.mjs` | node:test, явные списки TS и скомпилированных JS | Новые unit-файлы добавить в обе части runner |
| `tests/runtime-architecture.test.tsx` | Проверяет дерево providers, dynamic loader/skeleton, параллельную загрузку | Адаптировать ожидаемую архитектуру, сохраняя поведенческие гарантии |

Точки вызова навигации: MainNavbar, UserProfileMenu, InventoryCockpitShell, HomePage, SettingsPage, OrdersV2View, ProductsV2View, OrderFormModal, AuthGuard, AdminPage, LoginPage, AboutHeader, AboutFooter и AboutPage. Перед заменой выполнить поиск по всему `src`, а не ограничиваться этой таблицей.

## 3. Архитектура и правила готовности

### 3.1. Координатор

Создать `src/shared/ui/page-transition/`:

- `model.ts`: типы, фиксированный набор задач, чистый reducer, монотонный прогресс и проверка разрешения раскрытия. Без React/DOM.
- `routePlan.ts`: классификация href, применимые этапы, alias `/profile`, сравнение навигаций.
- `PageTransitionProvider.tsx`: жизненный цикл, уникальный id, Motion sequencing, request navigation, единственный активный переход.
- `PageLoadingOverlay.tsx`: только вид заставки, состояние и обработчики завершения анимаций.
- `PageTransitionLink.tsx`: адаптер next/link с onNavigate, обычным href и сохранением нативного поведения.
- `usePageReadiness.ts`: явное подтверждение реального представления и ресурсов по transition id.
- `ProtectedPageReadiness.tsx`: мост уже существующих AuthProvider/DataProvider к координатору; монтируется внутри них, но выше AuthGuard.
- `waitForPageAssets.ts`: ожидание конкретных изображений/шрифтов, AbortSignal, обработка ошибок и освобождение подписок.
- `index.ts`: публичные экспорты; серверная логика не должна импортировать тяжёлые runtime-компоненты через barrel.

Схема: `idle → covering → loading → finishing → revealing → idle`. Дополнительные выходы: `error`, отмена текущего id, redirect/replacement. Короткая загрузка может миновать ожидание в loading, но не завершение covering/finishing/revealing.

У каждой операции есть `transitionId`. Событие от предыдущего перехода, уничтоженного компонента или прежнего пользователя игнорируется. По новой навигации старые визуальные callbacks не могут убрать новую заставку. Cleanup останавливает controls, RAF, таймер диагностики и обработчики. Не ожидать бесконечно Promise остановленной анимации: completion всегда проверяет актуальность id; отмена завершает собственное ожидание независимо от Motion.

Повторный запрос на тот же target объединяется. При новой цели побеждает последний разрешённый запрос. При смене цели начать новый счёт прогресса с явным коротким растворением старой надписи под уже закрытым экраном; не показывать предыдущие 90% как прогресс новой страницы.

### 3.2. Дерево providers и слой страницы

RootLayout оставляет AppBackground на месте и оборачивает children в AppMotionProvider + PageTransitionProvider. Убрать дубли AppMotionProvider из трёх route-group layouts после проверки дерева. Auth/Data/Toast/OrderModal сохраняют нынешние области жизни.

Под DataProvider, до AuthGuard, смонтировать ProtectedPageReadiness. Он получает useAuth/useData, публикует auth и `data:*` для активного id, в том числе мгновенно воспроизводит уже готовый snapshot при новом переходе. Так у новой вкладки не возникает ожидания событий загрузки, которые произошли раньше. Публикации ограничить текущим пользователем/revision, а root provider не должен сам вызывать useAuth/useData за пределами их контекста. На публичных страницах auth готовность публикуется из локального AuthProvider через их readiness-hook; закрытого DataProvider там нет.

PageTransitionProvider выводит два соседних DOM-слоя: постоянную оболочку children с ref и фиксированную заставку. Заставка находится вне opacity/transform-контекста children. Не задавать transform корневой оболочке: он меняет поведение fixed-потомков. Для страницы достаточно opacity.

При loading дети смонтированы, участвуют в layout, имеют opacity 0 и inert/aria-hidden; не использовать `display:none` и не возвращать null вместо детей. Иначе не загрузятся dynamic-компоненты, не выполнятся effects и возникнет взаимное ожидание.

Блокировка прокрутки не должна убирать полосу и сдвигать страницу. Использовать стабильное резервирование scrollbar либо компенсацию с сохранением прежних inline-значений; не перезаписывать блокировку открытой модалки. После раскрытия удалить временную изоляцию opacity, чтобы не оставить неожиданный stacking context у модалок.

### 3.3. Явная готовность, без угадывания

- `usePathname` и pending из React/Link не означают, что данные и lazy-компоненты готовы.
- Route marker должен находиться в целевом представлении, не только в общем layout. Старый маркер сверяет свой viewKey и captured id с target.
- Workspace сообщает `module` после loader, `view` только из реального динамического содержимого. Маркер рядом с dynamic снаружи может смонтироваться одновременно со skeleton — так делать нельзя.
- React commit подтверждается после применения DataProvider state и восстановления местного состояния. Для `usePersistentState` допустимо добавить четвёртый элемент tuple `hydrated: boolean`, сохранив позиции существующих трёх. Сигнал относится к текущим key/storage scope, сбрасывается при их смене; ошибка чтения означает стабильный default, а не вечную загрузку.
- Перед раскрытием дождаться завершающего commit/двух animation frames для отрисовки подготовленного дерева. Два RAF не заменяют явное ожидание асинхронных данных, изображений или хранилища.
- Критичные изображения первого экрана выбирать по явным ref/атрибутам в готовом дереве. Для hub — видимые иконки выбранного стиля. Картинки ниже экрана, lazy-разделы About, декоративные непрерывные анимации, realtime и аналитика не блокируют страницу.
- Не ждать lazy-картинку, которая не начнёт загружаться из-за скрытого состояния. Критичные изображения загружать eager; ошибка decode/load завершается стабильным placeholder фиксированного размера. Смена currentSrc/style до раскрытия инвалидирует предыдущую проверку ресурсов.
- Шрифты проверять адресно для применяемых Inter/JetBrains Mono, а не ждать неопределённо все шрифты документа. Сохранять next/font.
- Обновление фильтров/таблиц после раскрытия остаётся обычным локальным поведением. Общий индикатор не перезапускается.

### 3.4. Ошибки и задержки

Ошибка обязательного запроса без пригодного fallback не засчитывается как успешный этап. Завершение API через существующий корректный localStorage fallback считается готовыми данными. `isLoading=false` из finally само по себе не доказывает успех.

При ошибке остановить заполнение, плавно сменить подпись на «Не удалось открыть страницу» и показать CockpitButton «повторить» и «на главную». Повтор создаёт новый id и реальный новый запрос. Для ChunkLoadError допустима явная кнопка перезагрузки, не бесконечный автоматический retry.

На 15-й секунде незавершённого перехода показать сообщение «Загрузка занимает больше времени» с действиями повторить/перейти на главную. Не присваивать 100% и не раскрывать незагруженное содержимое по timeout. Действия должны снимать блокировку и работать даже при зависшем запросе.

`src/app/error.tsx`, `not-found.tsx` должны иметь аварийный сигнал координатору, чтобы готовое сообщение ошибки не осталось под заставкой. В установленном Next у error.tsx уже prop `retry`: сверить локальные docs, не заменять на привычный `reset` вслепую. `global-error.tsx` заменяет root layout — обязан работать без контекста координатора. Необязательные хуки вне provider возвращают безопасный no-op.

### 3.5. Вид и доступность

Непрозрачный `#0a0a0a`/bg-dot-grid, центральная компактная cockpit-консоль с `rounded-2xl border-white/15 bg-neutral-950/90 backdrop-blur-2xl`, терминальная шапка с тремя точками и `3D-LABS // LOADING`, нижняя телеметрия и `3D LABS · LOADING RUNTIME`. Основной акцент — крупный моноширинный LOADING; исходный текст приглушённый, заполнение — `var(--cockpit-accent-color)`. Никаких бликов, неона, цветных градиентов и дополнительного спиннера.

Заполнение двумя одинаковыми слоями текста, верхний ограничен clip-path. Не анимировать width контейнера и не растягивать сами буквы scaleX. Размер и line-height фиксированы, размер текста адаптивен через clamp; не создавать горизонтальный скролл на 320–390px. Clip-path маленького текста допустим после проверки; не анимировать большой blur на весь экран.

Один доступный progressbar `aria-label="Подготовка страницы"`, `aria-valuetext="Готовность этапов загрузки: …"`. Дубликаты LOADING — aria-hidden. Не озвучивать каждый кадр: aria-значение обновлять только при изменении реальных этапов. `aria-busy` у области содержимого; во время скрытия не доступны её controls. После раскрытия фокус на main/заголовок при обычном переходе; Back/Forward сохраняет ожидаемый фокус и scroll restoration. При отмене подтверждения настроек фокус остаётся в исходном сценарии.

`prefers-reduced-motion`: сохранить порядок готовности, убрать sweep/перемещение, применять полученные значения заполнения сразу и короткий fade 80 мс. Обработчики завершения не должны зависеть от ненулевой длительности.

## 4. Обязательная документация для исполнителя

До написания кода прочитать местные гайды установленного Next:

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md` — onNavigate.
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` — Native History API.
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`

Применить навыки motion, context7, vercel-react-best-practices, test-driven-development и verification-before-completion. При изменениях DataProvider/AuthProvider прочитать supabase; SQL для этого плана не нужен. Для браузерной проверки — playwright-mcp. Перед визуальной реализацией — frontend-design и проектный DESIGN_SYSTEM.

Проверенные источники: [Motion animate](https://motion.dev/docs/animate), [Motion accessibility](https://motion.dev/docs/react-accessibility), [Next useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status), [Next Link](https://nextjs.org/docs/app/api-reference/components/link). В данном проекте `useLinkStatus` даёт pending, а не процент готовности страницы. Поэтому он не является источником общей шкалы.

**Версионная ловушка:** Context7 при проверке вернул старый совет `await animation` вместо `.finished`. В реально установленном Motion 13.1.1 `node_modules/motion-dom/dist/index.d.ts` содержит `AnimationPlaybackControls.finished`, а then помечен deprecated у части классов. Для completion использовать API установленного пакета и проверить TS; не переносить устаревший совет Context7 автоматически.

## 5. Публичные контракты

Типы ниже — согласованные границы модулей, а не предложение полностью скопировать reducer без его реализации.

```ts
export type TransitionPhase =
  | 'idle' | 'covering' | 'loading' | 'finishing' | 'revealing' | 'error';
export type NavigationKind = 'route' | 'workspace' | 'bootstrap' | 'pop';
export type TransitionTaskId =
  | 'route' | 'auth' | 'module' | 'view' | 'assets'
  | `data:${'connection' | 'settings' | 'filaments' | 'printers'
      | 'savedCalculations' | 'collections' | 'orders' | 'monthlyGoals'}`;
export interface TaskDefinition { id: TransitionTaskId; weight: number }
export interface TransitionState {
  id: number;
  target: string;
  kind: NavigationKind;
  phase: TransitionPhase;
  tasks: ReadonlyArray<TaskDefinition>;
  completed: ReadonlySet<TransitionTaskId>;
  covered: boolean;
  preparedView: string | null;
  error: string | null;
}
export type TransitionEvent =
  | { type: 'begin'; id: number; target: string; kind: NavigationKind;
      tasks: ReadonlyArray<TaskDefinition> }
  | { type: 'complete'; id: number; task: TransitionTaskId }
  | { type: 'view-prepared'; id: number; viewKey: string }
  | { type: 'covered' | 'finish' | 'fill-complete' | 'reveal-complete' | 'cancel'; id: number }
  | { type: 'fail'; id: number; message: string };
export interface NavigationOptions {
  replace?: boolean;
  scroll?: boolean;
  beforeNavigate?: (href: string) => boolean | Promise<boolean>;
}
export interface WorkspaceDriver {
  owns: (fromHref: string, toHref: string) => boolean;
  commit: (href: string, transitionId: number) => void;
  beforeReveal: (href: string, transitionId: number) => void;
  complete: (href: string, transitionId: number) => void;
}
export interface PageTransitionApi {
  state: TransitionState;
  navigate: (href: string, options?: NavigationOptions) => Promise<boolean>;
  completeTask: (id: number, task: TransitionTaskId) => void;
  fail: (id: number, message: string) => void;
  prepareView: (id: number, viewKey: string) => void;
  registerWorkspace: (driver: WorkspaceDriver) => () => void;
  registerGuard: (guard: (href: string) => boolean | Promise<boolean>) => () => void;
}
```

`beforeReveal` применяется до завершающего подтверждения view: например, отпускает удержание расширенной оболочки. Нельзя вызвать его после исчезновения заставки и получить скачок. Для предотвращения цикла он вызывается один раз после предварительной готовности представления, а окончательный `view` подтверждается следующим commit. `complete` отвечает за завершение history-контракта workspace после раскрытия.

`prepareView(id, viewKey)` вызывается readiness-hook после готовности данных/компонента и запускает beforeReveal однократно для соответствующего driver. Координатор публикует обновление подготовки, hook подтверждает view в следующем commit после применения изменений оболочки. Для обычного маршрута prepareView только подтверждает подготовку. Guard регистрируется один на текущую страницу, cleanup удаляет именно свою регистрацию. При наличии зарегистрированного guard не дублировать его через beforeNavigate той же ссылки.

Обновление подготовки — событие `view-prepared` и поле `state.preparedView`. На begin поле сбрасывается в null, устаревшее событие игнорируется. Root readiness marker сверяет preparedView с собственным viewKey прежде чем засчитать окончательный view. В отсутствие отдельного wrapper route-готовность обычной страницы может публиковаться тем же hook, но только для совпадающего target.

Href нормализовать через URL относительно текущего origin, сохраняя query/hash при навигации. В качестве идентичности page view использовать pathname и явно значимые параметры; `/settings?section=profile` и `/settings?section=general` не инициируют самостоятельный полноэкранный переход в уже открытых настройках. Не передавать произвольные javascript:/внешние URL в router.

## Задача 1. Чистая модель прогресса и навигационных целей

**Файлы:** создать `src/shared/ui/page-transition/model.ts`, `routePlan.ts`, `tests/page-transition-model.test.ts`; изменить `scripts/test.mjs`.

**Интерфейсы:** экспортировать `initialTransitionState`, `transitionReducer(state, event)`, `getRealProgress(state): number`, `canFinish(state): boolean`, `createRouteTasks(pathname): TaskDefinition[]`, `isPageNavigation(fromHref, toHref): boolean` и типы раздела 5.

- [ ] До изменения кода сохранить вывод `git status --short`, выполнить базовый `npm test` и отметить исходные сбои. При red/green сравнивать результат новых тестов с этой базой; падение постороннего теста не доказывает корректность нового теста.
- [ ] Написать node:test на преждевременное завершение, stale id, duplicate task и сравнение URL. Начальная проверка:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { initialTransitionState, transitionReducer, getRealProgress, canFinish }
  from '../src/shared/ui/page-transition/model';

test('complete data does not finish a page without committed view', () => {
  let state = transitionReducer(initialTransitionState, {
    type: 'begin', id: 1, target: '/orders', kind: 'route',
    tasks: [{ id: 'data:orders', weight: 1 }, { id: 'view', weight: 1 }],
  });
  state = transitionReducer(state, { type: 'covered', id: 1 });
  state = transitionReducer(state, { type: 'complete', id: 1, task: 'data:orders' });
  assert.equal(getRealProgress(state), 0.5);
  assert.equal(canFinish(state), false);
  const unchanged = transitionReducer(state, { type: 'complete', id: 0, task: 'view' });
  assert.deepEqual(unchanged, state);
  state = transitionReducer(state, { type: 'complete', id: 1, task: 'view' });
  assert.equal(canFinish(state), true);
  assert.equal(state.phase, 'loading');
});
```

- [ ] Добавить файл в `unitTestFiles` и JS-список runner; выполнить `npm test`, убедиться, что новый тест падает из-за отсутствующей реализации.
- [ ] Реализовать immutable reducer с проверкой id и допустимых phase. `finish` допускается только при canFinish; `fill-complete` только из finishing; `reveal-complete` только из revealing. В error автоматического finish нет. Неизвестный task не меняет прогресс.

```ts
export function getRealProgress(state: TransitionState): number {
  const total = state.tasks.reduce((sum, task) => sum + task.weight, 0);
  if (total === 0) return 0;
  const done = state.tasks.reduce(
    (sum, task) => sum + (state.completed.has(task.id) ? task.weight : 0), 0,
  );
  return Math.min(1, Math.max(0, done / total));
}
export function canFinish(state: TransitionState): boolean {
  return state.covered && state.phase === 'loading' && !state.error
    && state.tasks.length > 0
    && state.tasks.every(task => state.completed.has(task.id));
}
```

- [ ] Добавить проверки: все задачи до covered; повтор complete; fail после частичного прогресса; новая begin из revealing; старый fill-complete после новой begin; current/hash/query links; profile alias; public route без data-задач. Каждая проверка должна утверждать итог phase/progress/history decision, а не текст исходников.
- [ ] Выполнить `npm test`, зафиксировать результат в рабочем отчёте исполнителя.

## Задача 2. Наблюдаемые этапы первичных данных

**Файлы:** изменить `src/entities/model/loadInitialData.ts`, `DataProvider.tsx`; создать `tests/page-loading-data.test.ts`; изменить runner и существующий runtime-architecture test при необходимости.

**Интерфейсы:** в `loadInitialData.ts` экспортировать `InitialDataTaskId` (8 ключей без `data:`) и `InitialDataObserver = (task: InitialDataTaskId, outcome: 'ready' | 'error') => void`; добавить необязательный второй аргумент `loadInitialData(dataApi, onTask?)`. DataProvider предоставляет `initialLoad: { revision: number; completed: readonly InitialDataTaskId[]; status: 'loading' | 'ready' | 'error' }`.

- [ ] Написать тест с 8 управляемыми Promise: после вызова запущены все восемь функций, но завершена только разрешённая задача. Взять готовый mock `InitialDataApi` из `tests/runtime-architecture.test.tsx`, а не вызывать Supabase.

```ts
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
test('one unresolved request keeps the initial data promise pending', async () => {
  const orders = deferred<Awaited<ReturnType<InitialDataApi['getOrders']>>>();
  const started: string[] = [];
  const events: Array<[string, string]> = [];
  const resolved = <T,>(id: string, value: T) => {
    started.push(id);
    return Promise.resolve(value);
  };
  const api: InitialDataApi = {
    checkSupabaseConnection: () => resolved('connection', false),
    getSettings: () => resolved('settings', {} as Awaited<ReturnType<InitialDataApi['getSettings']>>),
    getFilaments: () => resolved('filaments', []),
    getPrinters: () => resolved('printers', []),
    getSavedCalculations: () => resolved('savedCalculations', []),
    getCollections: () => resolved('collections', []),
    getOrders: () => { started.push('orders'); return orders.promise; },
    getMonthlyGoalsConfig: () => resolved('monthlyGoals', {} as Awaited<ReturnType<InitialDataApi['getMonthlyGoalsConfig']>>),
  };
  let settled = false;
  const result = loadInitialData(api, (id, outcome) => events.push([id, outcome]));
  void result.then(() => { settled = true; });
  assert.equal(started.length, 8);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(events.length, 7);
  assert.equal(events.some(([id]) => id === 'orders'), false);
  orders.resolve([]);
  const data = await result;
  assert.deepEqual(data.orders, []);
  assert.equal(events.length, 8);
  assert.deepEqual(events.at(-1), ['orders', 'ready']);
});
```

В начало тестового файла добавить импорты `assert` из node:assert/strict, `test` из node:test и `loadInitialData, type InitialDataApi` из `../src/entities/model/loadInitialData`. Объекты settings/monthlyGoals в этом тесте — только проходящие через helper значения; реальные shape/assertions уже покрывает runtime-architecture.

- [ ] Реализовать обёртку запуска без изменения параллелизма и значений результатов:

```ts
function observe<T>(
  id: InitialDataTaskId,
  run: () => Promise<T>,
  report?: InitialDataObserver,
): Promise<T> {
  return run().then(value => {
    report?.(id, 'ready');
    return value;
  }, error => {
    report?.(id, 'error');
    throw error;
  });
}
```

- [ ] Обернуть все 8 существующих вызовов в observe, оставить их в одном параллельном запуске. Observer в production должен только публиковать snapshot и не бросать исключения.
- [ ] DataProvider увеличивает revision на новый load, публикует completed по мере событий, принимает state/result только от текущего revision и текущего пользователя. Logout/unmount инвалидируют старые результаты. Не добавлять React-зависимость от координатора в `loadInitialData.ts`.
- [ ] Успех публикации `initialLoad.status='ready'` идёт с применением данных, ошибка — отдельный status. Сохранить существующую обработку кэша и сообщения. Фоновый refresh при уже раскрытой странице не запускает новую заставку.
- [ ] Проверить успешный cache result, отклонённую задачу, отсутствие observer и устаревший revision. Выполнить `npm test`.

## Задача 3. Motion-заставка и сохраняющийся координатор

**Файлы:** создать `PageTransitionProvider.tsx`, `PageLoadingOverlay.tsx`, `index.ts`; изменить `src/app/layout.tsx`, layouts `(protected)`, `(about)`, `(login)`, `tests/runtime-architecture.test.tsx`; создать `tests/page-loading-overlay.test.tsx`.

**Интерфейсы:** `usePageTransition(): PageTransitionApi | null`; overlay получает phase, нормализованный progress MotionValue и callbacks `onCovered`, `onFillComplete`, `onRevealComplete`, каждый связан с captured id. Root owns navigation lifetime; overlay не вызывает router.

- [ ] Написать SSR markup-test доступности: один progressbar, LOADING скрыт для озвучивания в двух визуальных слоях, aria-значение не 100 при незавершённых этапах; добавить тесты reducer sequencing задачи 1 перед подключением UI.
- [ ] Реализовать два текстовых слоя и MotionValue-маску:

```tsx
const fill = useMotionValue(0);
const clipPath = useTransform(fill, [0, 1], [
  'inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)',
]);
// В области фиксированного размера:
<span aria-hidden="true" className="relative inline-block font-mono leading-none">
  <span className="text-neutral-700">LOADING</span>
  <motion.span className="absolute inset-0 text-[var(--cockpit-accent-color)]"
    style={{ clipPath }}>LOADING</motion.span>
</span>
```

- [ ] Движение к текущей цели: `animate(fill, Math.min(realProgress, 0.97), { duration: 0.14, ease: 'easeOut' })`; остановить предыдущие controls перед новым target. Не обновлять весь provider на каждом кадре и не читать fill.get() в render.
- [ ] Финальная последовательность использует actual completion установленного Motion. В provider определить `isCurrent(id: number): boolean` по activeIdRef и AbortSignal, `release(id: number): void` для снятия инертности, восстановления scroll/focus и вызова актуального WorkspaceDriver.complete. Следующий фрагмент задаёт порядок:

```ts
const finalFill = animate(fill, 1, { duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' });
await finalFill.finished;
if (!isCurrent(id)) return;
dispatch({ type: 'fill-complete', id });
const fadeOut = animate(overlayOpacity, 0, { duration: reducedMotion ? 0.08 : 0.30 });
const fadeIn = animate(contentOpacity, 1, { duration: reducedMotion ? 0.08 : 0.30 });
await Promise.all([fadeOut.finished, fadeIn.finished]);
if (!isCurrent(id)) return;
dispatch({ type: 'reveal-complete', id });
release(id);
```

- [ ] Реализовать covering completion, abort lifecycle, начальный bootstrap и refs без смены ключа дерева children. Не выполнять dispatch в render. Смена id инвалидирует всю цепочку.
- [ ] Поставить provider в RootLayout, сохранить connection(), fonts и AppBackground. Удалить лишь дубли AppMotionProvider из group layouts, не переносить Auth/Data в корень.
- [ ] Обновить архитектурные тесты под новый wrapper, сохранив проверки областей жизни Auth/Data и lazy loading. Выполнить `npm test` и typecheck.

## Задача 4. Готовность реального контента, ресурсов и fallback

**Файлы:** создать `usePageReadiness.ts`, `waitForPageAssets.ts`, `ProtectedPageReadiness.tsx`; изменить `(protected)/layout.tsx`, `src/shared/lib/usePersistentState.ts`, `src/app/loading.tsx`, `src/shared/ui/AuthGuard.tsx`, HomePage, SettingsPage, AdminPage, AboutPage, LoginPage, `src/app/error.tsx`, `not-found.tsx`. `global-error.tsx` проверить отдельно.

**Интерфейсы:** `usePageReadiness({ viewKey, ready, rootRef }: { viewKey: string; ready: boolean; rootRef: React.RefObject<HTMLElement | null> }): void`; `waitForPageAssets(root: HTMLElement, signal: AbortSignal): Promise<void>`. Четвёртый элемент usePersistentState — boolean hydrated, первые три неизменны.

- [ ] Написать тесты состояния hydrated для отсутствующего/испорченного storage и смены scope; DOM-эффекты проверять Playwright, не SSR renderToStaticMarkup. В unit проверить pure условия разрешения view.
- [ ] Добавить hydrated после применения storage/default; не использовать отсутствие значения как признак незавершённой гидратации. Существующие потребители с тройной деструктуризацией продолжают работать.
- [ ] В каждом реальном page/component поставить marker с viewKey и ready, учитывающим auth/data/hydrated конкретной страницы. Вызов hook всегда до условного return, а rootRef у реального содержимого, не skeleton.

```tsx
const rootRef = useRef<HTMLDivElement>(null);
const { isLoading, initialLoad } = useData();
const [isExpanded, setIsExpanded, , settingsHydrated] =
  usePersistentState<boolean>('3d_settings_expanded_view', false);
usePageReadiness({
  viewKey: '/settings',
  ready: !isLoading && initialLoad.status === 'ready' && settingsHydrated,
  rootRef,
});
```

Это заменяет существующий вызов usePersistentState страницы, не добавляет второй экземпляр для того же ключа. rootRef установить на наружный div готовой страницы; дочерние SettingsForm state/effects также должны завершить начальную подготовку перед окончательным view.

- [ ] Внутри hook сверить target/id, дождаться ресурсов с AbortSignal, окончательного состояния оболочки и двух RAF; затем completeTask(id, 'view')/completeTask(id, 'assets') по соответствующим событиям. Разделить предварительную готовность для beforeReveal и окончательный commit, не образовать цикл ожидания.
- [ ] Реализовать ProtectedPageReadiness по разделу 3.2: auth, completed initialLoad tasks и ошибки публикуются в активный id, готовый snapshot воспроизводится при новой навигации. Не включать isOnline в обязательное условие готовности: рабочий offline-кэш должен раскрываться.
- [ ] waitForPageAssets не следит за всей сетью. Адресно проверить critical images (load/error/decode, актуальный currentSrc), шрифты, отмену; ошибка картинки переключает её на резерв фиксированного размера до разрешения этапа. Не считывать геометрию после DOM-записи в каждом кадре.
- [ ] В loading.tsx оставить fallback для режима без координатора, при активном переходе сделать его ненавязчивым скрытым fallback под overlay. Не удалять skeleton-экспорты и не использовать unmount fallback как сигнал полной готовности.
- [ ] AuthGuard сообщает auth/redirect до условного render; не допускает загрузку закрытого контента ради анимации. `/profile` нормализуется к финальной странице. error/404 дают конечный сигнал, global-error остаётся независимым.
- [ ] Запустить unit/typecheck; выполнить прямой вход в `/orders`, `/settings`, `/about`, `/login`, 404 с просмотром консоли и доступности. Проверить, что готовый error не прикрыт вечной заставкой.

## Задача 5. Workspace: lazy-код, общая оболочка и история

**Файлы:** изменить `workspaceDefinitions.tsx`, `CockpitWorkspace.tsx`, `CockpitContentTransition.tsx`; добавить `src/widgets/CockpitWorkspace/WorkspaceReadyBoundary.tsx`; изменить `tests/workspace-navigation.test.tsx`, `tests/runtime-architecture.test.tsx`.

**Интерфейсы:** WorkspaceReadyBoundary принимает `tab: CockpitTabId`, `children: React.ReactNode`, сообщает готовность только после загрузки соответствующего компонента. WorkspaceDriver — контракт раздела 5. Публичные пропсы OrdersTable/ProductsList сохраняются.

- [ ] Добавить тест: completion входной анимации fallback не фиксирует history и не заканчивает переход; добавить test old completedTab против нового activeTab.
- [ ] Наблюдать за существующим loader. Кэшировать Promise одного импорта; при rejection сбросить кэш для retry. Не импортировать все шесть реализаций статически и не запускать все loader ради progress.
- [ ] ReadyBoundary должен быть возвращён loader вместе с реальным компонентом, а не оборачивать ещё не готовый dynamic снаружи. Схема с сохранением типов:

```tsx
function withWorkspaceReady<P extends object>(
  tab: CockpitTabId,
  load: () => Promise<React.ComponentType<P>>,
): () => Promise<React.ComponentType<P>> {
  return () => load().then(Component => function LoadedWorkspace(props: P) {
    return <WorkspaceReadyBoundary tab={tab}>
      <Component {...props} />
    </WorkspaceReadyBoundary>;
  });
}
```

Создавать loader-обёртки один раз на уровне модуля; при каждом render новые component identities недопустимы. Boundary дополнительно ждёт настоящие данные/гидратацию; сам факт wrapper mount недостаточен, если ребёнок имеет локальный async fallback.

- [ ] В CockpitWorkspace зарегистрировать driver; nav начинает координатор, commit выбирает activeTab под непрозрачной заставкой. Применить/снять heldExpandedShell в beforeReveal, дождаться нового layout commit. Только потом разрешить окончательный view.
- [ ] При управляемом переходе отключить локальный enter/exit CockpitPanelTransition: `initial={false}`, сразу видимое внутреннее состояние за общей opacity-оболочкой. Обычный локальный режим компонента оставить пригодным отдельно.
- [ ] Разделить старый handlePanelTransitionComplete: изменение геометрии — до reveal, history commit — в driver.complete. `commitCockpitHistoryIfCurrent` вызывается ровно один раз для последней вкладки; pop не вызывает push. Запись history не запускает координатор повторно.
- [ ] Убедиться, что сохранены navbar/footer DOM identity и состояние DataProvider/калькулятора. Обновить unit-тесты и проверить три последовательных переключения, расширенные Orders/Products и Back/Forward.

## Задача 6. Единая навигация и несохранённые настройки

**Файлы:** создать PageTransitionLink.tsx; изменить PixelCurtain.tsx, MainNavbar.tsx, UserProfileMenu.tsx, InventoryCockpitShell.tsx, SettingsPage, HomePage, AuthGuard, AdminPage, LoginPage, AboutPage/AboutHeader/AboutFooter, OrdersV2View, ProductsV2View, OrderFormModal и прямую навигацию CockpitWorkspace.

**Интерфейсы:** PageTransitionLink сохраняет props Next Link и добавляет `beforeNavigate?: NavigationOptions['beforeNavigate']`; imperative `navigate` из PageTransitionApi. `usePixelCurtain()` временно сохраняет `{ navigate, isTransitioning }` через адаптер нового provider.

- [ ] Перед изменением найти все пути навигации: `rg -n 'usePixelCurtain|router\.(push|replace)|window.history|<Link|<a' src`. Разделить настоящие переходы и локальные query/hash/download действия.
- [ ] Реализовать адаптер next/link через onNavigate; сначала вызвать пользовательский onNavigate и проверить prevented, затем preventDefault и await beforeNavigate. Сам координатор также не начинает анимацию до положительного guard. Сохранить href/prefetch/target/ref и клики с модификаторами.

```tsx
<Link href={href} onNavigate={(event) => {
  event.preventDefault();
  void transition.navigate(String(href), { beforeNavigate });
}}>{children}</Link>
```

В production-компоненте поддержать фактический тип href из LinkProps (URL object форматировать корректно), внешний onNavigate и fallback вне provider; фрагмент показывает только порядок вызовов.

- [ ] Заменить активный PixelCurtainProvider на совместимый pass-through/adapter без document capture и timeout. Старый визуальный PixelCurtain можно оставить неактивным, если нужен резерв, но не монтировать параллельно LOADING.
- [ ] Все разрешённые imperative переходы направить через navigate. Logout сначала действительно завершает выход, затем replace `/login`; разрешения AuthGuard сохраняются. Никаких monkey patch router/history/window.fetch.
- [ ] В SettingsPage сохранить current pendingHref/диалог. Отмена не вызывает begin. Save and leave ждёт успешного сохранения; failure остаётся на месте. Discard очищает dirty перед переходом. Выход на home через меню профиля также проходит guard — старый capture больше не может его обойти.
- [ ] Зарегистрировать общий guard текущей SettingsPage в координаторе или передать его всем выходам этой страницы; выбрать регистрацию с cleanup, чтобы меню профиля и крестик оболочки использовали один и тот же guard. Не запускать один guard дважды через Link и provider.
- [ ] Для popstate сохранить существующую семантику браузера и не обещать отмену истории там, где её не было. Проверить, что pop не обходит уже существующие механизмы защиты; не внедрять скрытые push для «ремонта» истории.
- [ ] Повторить поиск навигации; оставшиеся router-вызовы должны быть осознанными внутренними реализациями координатора или неподходящими для анимации действиями. Выполнить unit и сценарии SettingsPage из существующего e2e/settings-workspace.spec.ts.

## Задача 7. Ошибки, отмена, доступность и отсутствие скачков

**Файлы:** завершить provider/overlay/waitForPageAssets; изменить `src/app/globals.css` только при необходимости статического scrollbar-gutter; создать `e2e/page-transitions.spec.ts`.

- [ ] Добавить проверки ошибки обязательного этапа и переключения новой цели во время finishing. Тест reducer обязан доказать, что старый fill-complete не меняет фазу нового перехода.
- [ ] Реализовать действия error/slow-state, очистку abort, RAF и diagnostic timeout; встроенные кнопки только CockpitButton. Конкретный вызов при неисправном asset: `fail(id, 'Не удалось подготовить страницу')` только если стабильная замена невозможна, иначе готовность после commit замены.
- [ ] Описать и проверить focus/scroll lifecycle: обычный переход — main, pop — восстановление; непоказанные элементы inert. Сохранить и вернуть ранее существовавшие inline-стили scroll lock, не снимать чужую блокировку.
- [ ] Использовать `useReducedMotion()` для исходных параметров Motion и финального completion при нулевой длительности. В Playwright: `await page.emulateMedia({ reducedMotion: 'reduce' })`.
- [ ] Для измерения скачков сравнивать bounding boxes устойчивых контрольных элементов на reveal-complete, через следующий кадр и через 300 мс. Помимо общей метрики LayoutShift, проверять реальную геометрию: recent-input исключения CLS не должны скрыть сдвиг от перехода.
- [ ] Проверить root viewport width до/после блокировки scroll и высоту основного контейнера; целевое отклонение стабильных элементов после раскрытия ≤1 CSS px. Движущиеся декоративные hub-иконки не использовать как геометрические контрольные точки.

## Задача 8. Детерминированные браузерные тесты

**Файлы:** `e2e/page-transitions.spec.ts`, при необходимости `e2e/helpers/page-transition.ts`, новый `e2e-production/page-transitions.spec.ts` для публичного production smoke; существующие `routes-and-accessibility.spec.ts`, `visual-regression.spec.ts`, `settings-workspace.spec.ts`, `playwright.production.config.ts` только для ожидания готовности/реальной совместимости.

**Наблюдаемость:** на корне coordinator `data-transition-phase`, `data-transition-id`, `data-transition-target`; на overlay `data-testid="page-loading-overlay"`, на progressbar aria-valuenow реальных этапов; у содержимого `data-testid="page-transition-content"`. У finished-надписи/overlay phase доступен для измерения времени. Эти поля не содержат персональных данных.

- [ ] Написать helper ожидания окончательного idle; existing screenshots должны ждать его и реального содержимого, а не фиксированного sleep.

```ts
async function waitForPageReady(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-transition-phase]')).toHaveAttribute('data-transition-phase', 'idle');
  await expect(page.getByTestId('page-loading-overlay')).toHaveCount(0);
  await expect(page.getByTestId('page-transition-content')).not.toHaveAttribute('inert', '');
}
```

- [ ] Установить Playwright route interception до первого goto, чтобы отключить HTTP cache для теста. После готовности исходной страницы включить gate для следующих JS chunks; выбрать ранее не загруженную workspace-вкладку. Сначала assert реально перехваченного запроса, иначе сценарий нельзя считать тестом slow chunk. Открыть gate в finally.

```ts
let hold = false;
let blocked = 0;
let release!: () => void;
const gate = new Promise<void>(resolve => { release = resolve; });
await page.route('**/_next/static/**/*.js', async route => {
  if (hold) { blocked += 1; await gate; }
  await route.continue();
});
await page.goto('/settings');
await waitForPageReady(page);
hold = true;
try {
  await page.getByRole('link', { name: 'Статистика', exact: true }).click();
  await expect.poll(() => blocked).toBeGreaterThan(0);
  const progress = page.getByRole('progressbar', { name: 'Подготовка страницы' });
  await expect(progress).toBeVisible();
  expect(Number(await progress.getAttribute('aria-valuenow'))).toBeLessThan(100);
} finally {
  hold = false;
  release();
}
await waitForPageReady(page);
```

Если реальный сборщик уже загрузил выбранный chunk, использовать другой ещё не импортированный раздел или отложить конкретный критичный hub image, а не принимать пустой blocked. Не зависеть от хэша chunk-файла. Медленную DataProvider-последовательность дополнительно детерминированно проверяет unit deferred API из задачи 2; при наличии работающего локального backend e2e может задерживать его настоящий endpoint.

- [ ] Во время gate проверять отсутствие доступного/видимого нового содержимого, отсутствие ложного 100%, отсутствие повторного запуска заполнения. После release — содержимое действительно нужной страницы и снятый inert.
- [ ] Зафиксировать через MutationObserver/RAF начало revealing и значения opacity. Между окончанием финального fill и началом снижения opacity нет отдельного удержания; в активной вкладке допуск до двух кадров. Финальный fade может показывать заполненную надпись, но она уже исчезает. Не считать это ошибочным ожиданием на 100%.
- [ ] Добавить сценарии: cache hit, переход из hub и обратно, все шесть вкладок, раскрытые Orders/Products, быстрые A→B→C и browser Back/Forward, профиль redirect, login/logout, guest/admin access, 404, chunk error, broken image, offline cache, отмена/сохранение/ошибка сохранения настроек, same-page/query/hash/modifier clicks, reduced motion, mobile/desktop.
- [ ] Проверить, что navbar/footer узлы при переключении workspace не пересоздаются, calculator state сохраняется, история содержит ровно один entry для завершённого перехода. Локальная подгрузка без смены страницы не вызывает overlay.
- [ ] Проверить skeleton отдельно: fallback остаётся доступным вне активного координатора/при локальной подгрузке; основной навигационный путь не раскрывает skeleton между LOADING и контентом.
- [ ] Для production использовать существующий production config и предусмотренный им способ авторизации. Не включать development session в production ради теста. Проверить различия prefetch/streaming на build, а не ограничиться dev-сервером.

Production config сейчас имеет отдельный testDir `e2e-production`, поэтому обычный e2e-файл там автоматически не запускается. Создать отдельный smoke публичного перехода About → Login без внешней авторизации; защищённый production smoke запускать только при реальной доступной тестовой сессии. После сборки команда: `node node_modules/@playwright/test/cli.js test --config playwright.production.config.ts`. Production HTML-отчёт: `playwright-report/production/index.html`.

## Задача 9. Финальная проверка и передача результата

- [ ] Выполнить `npm test` — node:test и компиляция всех включённых тестов.
- [ ] Выполнить `node node_modules/typescript/bin/tsc --noEmit`.
- [ ] Выполнить `npm run lint`; существующие ошибки отличить от новых по исходному дереву, не маскировать disable-комментариями.
- [ ] Выполнить `npm run build` и браузерный smoke production в рамках существующей конфигурации. Если полноценный production auth smoke требует недоступной внешней сессии, явно записать ограничение; не считать покрытие выполненным.
- [ ] Выполнить `npm run test:e2e`. При регрессии screenshot исследовать реальную причину, не обновлять baseline автоматически.
- [ ] Открыть реальный переход в браузере с обычной скоростью и throttling: проверить заполнение, непрерывность завершения, мобильную компоновку, отсутствие рывка после исчезновения. Статичный screenshot сам по себе не доказывает плавность.
- [ ] Выполнить `git diff --check` и посмотреть diff затронутых файлов: нет удалённых skeleton, лишних провайдеров, установки пакетов, изменений SQL, непреднамеренных потерь исходных пользовательских правок.
- [ ] В отчёте перечислить изменённое поведение, количество passed/failed, путь `playwright-report/index.html`, непроверенные сценарии и реальные ограничения. Не утверждать точный процент сетевой загрузки.

## Критерии приёмки

- [ ] Ни один обязательный этап не pending/error, когда LOADING начинает заполняться до 100%.
- [ ] Полное заполнение сразу переходит в fade, без дополнительной паузы ожидания.
- [ ] Быстрая загрузка не обрывает анимацию; медленная не достигает фиктивного завершения.
- [ ] Реальная целевая страница монтируется за заставкой; нет deadlock «контент ждёт скрытия loader, loader ждёт контент».
- [ ] Скелетоны сохранены и работают в локальных/резервных сценариях.
- [ ] Все навигационные пути используют один координатор, включая локальные workspace-вкладки; старый PixelCurtain не конкурирует с ним.
- [ ] История, guards, auth, кэш и пользовательские настройки сохраняют своё назначение.
- [ ] После раскрытия нет изменения высоты оболочки, ширины из-за scrollbar и внезапного появления обязательных блоков.
- [ ] Ошибки/задержки позволяют восстановиться, старая операция не может раскрыть новую цель.
- [ ] Неподвижный режим, клавиатура и screen reader не блокируются скрытым контентом.
- [ ] Unit, typecheck, build и доступные e2e выполнены; результаты и ограничения записаны честно.

## Текст передачи другой модели

«Реализуй план `docs/superpowers/plans/2026-09-11-loading-page-transitions.md` в текущем проекте. Сначала прочитай весь документ, AGENTS.md, DESIGN_SYSTEM.md и актуальный код: в рабочем дереве есть незакоммиченные пользовательские изменения. Заполнение LOADING связывай с завершением наблюдаемых этапов загрузки; 100% разрешены только непосредственно перед плавным раскрытием готового контента. Сохрани скелетоны, локальную workspace-навигацию и защиту несохранённых настроек. Выполни указанные проверки. Не устанавливай пакеты, не обновляй визуальные эталоны, не коммить и не пушь без отдельной команды».
