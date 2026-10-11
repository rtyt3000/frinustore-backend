export interface Command {
  command: string
  description: string
}

/** shown in the «/» menu for everyone */
export const USER_COMMANDS: Command[] = [
  { command: 'menu', description: 'Главное меню' },
  { command: 'my', description: 'Мои плагины' },
  { command: 'describe', description: 'Описание и иконка плагина' },
  { command: 'cancel', description: 'Отменить текущий шаг' },
  { command: 'start', description: 'Начало работы' },
]

/** extra commands, only visible in the chats of moderators */
export const ADMIN_COMMANDS: Command[] = [
  { command: 'ban', description: 'Заблокировать пользователя: /ban id' },
  { command: 'unban', description: 'Разблокировать пользователя: /unban id' },
  { command: 'rebuild', description: 'Пересобрать catalog.json' },
  { command: 'backup', description: 'Дамп базы в JSON' },
]

export const SHORT_DESCRIPTION = 'Публикация плагинов для Inugram в маркете @frinu_store'

export const DESCRIPTION =
  'Бот-менеджер маркета плагинов Inugram. Пришлите файл .inu.js, укажите репозиторий и описание — после проверки плагин появится в канале @frinu_store и в каталоге приложения.'
