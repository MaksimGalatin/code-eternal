import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "ru" | "es" | "zh";

export const translations = {
  en: {
    // Login
    "login.tagline": "Your memory lives forever",
    "login.sub": "Eternal site on Arweave. Proof of Soul on Solana.",
    "login.cta": "Enter the Family",

    // Header
    "header.logout": "Logout",

    // Tabs
    "tab.cabinet": "Cabinet",
    "tab.aifa": "AIfa Terminal",
    "tab.games": "Games",
    "tab.dao": "DAO",
    "tab.site": "Site",
    "tab.contract": "Smart Contract",
    "tab.metrics": "Metrics",

    // Tier names
    "tier.spark": "Spark",
    "tier.archives": "Family Archives",
    "tier.dna": "Digital DNA",
    "tier.none": "No tier",

    // Cabinet — eternal site panel
    "cabinet.site.label": "Eternal Site",
    "cabinet.site.live": "✓ Live on Arweave",
    "cabinet.site.failed": "✕ Generation failed",
    "cabinet.site.generating": "⟳ Generating…",
    "cabinet.site.pending": "⟳ Pending…",
    "cabinet.site.openPassport": "Open Passport →",
    "cabinet.site.viewArweave": "View on Arweave →",

    // Cabinet — stats
    "cabinet.stats.burned": "Burned $CODE",
    "cabinet.stats.members": "Active Members",
    "cabinet.stats.sites": "Sites Created",

    // Cabinet — income
    "cabinet.income.title": "💰 My Income",
    "cabinet.income.earned": "total earned from referrals",
    "cabinet.income.locked": "locked",
    "cabinet.income.lockedHint": "You would have earned this with an active subscription",
    "cabinet.income.renew": "Renew →",
    "cabinet.income.copyLink": "Copy referral link",
    "cabinet.income.copied": "Copied!",
    "cabinet.income.noEarnings": "No referral earnings yet",

    // Cabinet — plan
    "cabinet.plan.title": "🏆 Your Plan",
    "cabinet.plan.active": "✓ Active",
    "cabinet.plan.expired": "✕ Expired",
    "cabinet.plan.daysLeft": "d left",
    "cabinet.plan.upgrade": "Upgrade",
    "cabinet.plan.activeUntil": "Active until",
    "cabinet.plan.expiredOn": "Expired",

    // Cabinet — expiry banner
    "cabinet.expiry.title": "⚠️ Subscription expired",
    "cabinet.expiry.desc": "Site editing is locked. Renew to unlock all features.",
    "cabinet.expiry.cta": "Renew Now →",

    // Cabinet — tiers
    "cabinet.tiers.title": "🏆 Choose Access Level",

    // Cabinet — top contributors
    "cabinet.top.title": "🏆 Top Contributors",

    // Cabinet — recent txns
    "cabinet.txns.title": "Recent Transactions",
    "cabinet.txns.confirmed": "✅ Confirmed",
    "cabinet.txns.error": "❌ Error",
    "cabinet.txns.pending": "⏳ Pending",

    // Site tab — form
    "site.title": "Create Your Eternal Site",
    "site.username": "Username",
    "site.displayName": "Display Name",
    "site.bio": "Bio",
    "site.manifesto": "Manifesto",
    "site.avatar": "Avatar",
    "site.avatarHint": "Upload photo (JPEG/PNG, max ~80 KB)",
    "site.socials": "Social Links",
    "site.telegram": "Telegram",
    "site.twitter": "Twitter / X",
    "site.website": "Website",
    "site.preview": "Preview",
    "site.submit": "Create Eternal Site",
    "site.submitting": "⏳ Generating...",
    "site.limitReached": "🔒 Update limit reached",
    "site.noTier": "Purchase a subscription to create your eternal site",
    "site.updatesUsed": "updates used",
    "site.permanent": "Your site is permanently saved on Arweave",
    "site.updatesThisPeriod": "updates this period",

    // Buy page
    "buy.back": "← Back to cabinet",
    "buy.title": "Payment Confirmation",
    "buy.subtitle": "Review details before payment",
    "buy.distribution": "Fund Distribution",
    "buy.wallet": "Wallet",
    "buy.balance": "Balance",
    "buy.confirm": "Confirm payment — $",
    "buy.preparing": "Preparing wallet...",
    "buy.loadingBalance": "Loading balance...",
    "buy.funding": "Funding wallet...",
    "buy.registering": "Registering on-chain...",
    "buy.processing": "Processing payment...",
    "buy.step.funding": "Funding wallet",
    "buy.step.registering": "Registering",
    "buy.step.payment": "Payment",
    "buy.devnet": "Solana devnet · mock USDC · no real funds",
    "buy.tryAgain": "Try again",
    "buy.openAifa": "Open AIfa Terminal",

    // Buy — success
    "buy.success.title": "Payment Confirmed!",
    "buy.success.sub": "Your site is being generated on Arweave",
    "buy.success.access": "Access activated",
    "buy.success.cabinet": "Go to Cabinet",

    // Buy — benefits
    "buy.benefit.pdf": "PDF guide",
    "buy.benefit.referral": "Personal referral link",
    "buy.benefit.aifa30": "AIfa chat (30 days)",
    "buy.benefit.fromSpark": "Everything from Spark",
    "buy.benefit.arweave": "Eternal site on Arweave",
    "buy.benefit.cnft": "cNFT Passport",
    "buy.benefit.aifa90": "AIfa chat (90 days)",
    "buy.benefit.fromArchives": "Everything from Archives",
    "buy.benefit.voice": "Voice clone",
    "buy.benefit.avatar3d": "3D avatar",
    "buy.benefit.aifa365": "AIfa chat (365 days)",
    "buy.benefit.vip": "VIP in DAO",

    // Games tab
    "games.title": "Game Arena",
    "games.subtitle": "Play against AIfa — your AI companion",
    "games.chess": "Chess",
    "games.chess.desc": "Classic chess vs AIfa",
    "games.ttt": "Tic-Tac-Toe",
    "games.ttt.desc": "Perfect minimax AI",
    "games.checkers": "Checkers",
    "games.checkers.desc": "Mandatory captures",
    "games.backgammon": "Backgammon",
    "games.backgammon.desc": "Roll & bear off",

    // Site — errors
    "site.usernameTaken": "Username already taken. Please choose another.",
  },

  ru: {
    // Login
    "login.tagline": "Твоя память живёт вечно",
    "login.sub": "Вечный сайт на Arweave. Доказательство Души на Solana.",
    "login.cta": "Войти в Семью",

    // Header
    "header.logout": "Выйти",

    // Tabs
    "tab.cabinet": "Кабинет",
    "tab.aifa": "Терминал AIfa",
    "tab.games": "Игры",
    "tab.dao": "DAO",
    "tab.site": "Сайт",
    "tab.contract": "Смарт-контракт",
    "tab.metrics": "Метрики",

    // Tier names
    "tier.spark": "Искра",
    "tier.archives": "Семейный Архив",
    "tier.dna": "Цифровая ДНК",
    "tier.none": "Нет тарифа",

    // Cabinet — eternal site panel
    "cabinet.site.label": "Вечный Сайт",
    "cabinet.site.live": "✓ Живёт на Arweave",
    "cabinet.site.failed": "✕ Ошибка генерации",
    "cabinet.site.generating": "⟳ Генерация…",
    "cabinet.site.pending": "⟳ Ожидание…",
    "cabinet.site.openPassport": "Открыть Паспорт →",
    "cabinet.site.viewArweave": "Просмотр на Arweave →",

    // Cabinet — stats
    "cabinet.stats.burned": "Сожжено $CODE",
    "cabinet.stats.members": "Активных участников",
    "cabinet.stats.sites": "Создано сайтов",

    // Cabinet — income
    "cabinet.income.title": "💰 Мой доход",
    "cabinet.income.earned": "заработано от рефералов",
    "cabinet.income.locked": "заблокировано",
    "cabinet.income.lockedHint": "Вы бы заработали это при активной подписке",
    "cabinet.income.renew": "Продлить →",
    "cabinet.income.copyLink": "Скопировать реф. ссылку",
    "cabinet.income.copied": "Скопировано!",
    "cabinet.income.noEarnings": "Реферальных доходов пока нет",

    // Cabinet — plan
    "cabinet.plan.title": "🏆 Ваш тариф",
    "cabinet.plan.active": "✓ Активен",
    "cabinet.plan.expired": "✕ Истёк",
    "cabinet.plan.daysLeft": "дн. осталось",
    "cabinet.plan.upgrade": "Улучшить",
    "cabinet.plan.activeUntil": "Активен до",
    "cabinet.plan.expiredOn": "Истёк",

    // Cabinet — expiry banner
    "cabinet.expiry.title": "⚠️ Подписка истекла",
    "cabinet.expiry.desc": "Редактирование сайта заблокировано. Продлите подписку.",
    "cabinet.expiry.cta": "Продлить →",

    // Cabinet — tiers
    "cabinet.tiers.title": "🏆 Выберите уровень доступа",

    // Cabinet — top contributors
    "cabinet.top.title": "🏆 Лучшие участники",

    // Cabinet — recent txns
    "cabinet.txns.title": "Последние транзакции",
    "cabinet.txns.confirmed": "✅ Подтверждено",
    "cabinet.txns.error": "❌ Ошибка",
    "cabinet.txns.pending": "⏳ Ожидание",

    // Site tab — form
    "site.title": "Создайте ваш вечный сайт",
    "site.username": "Имя пользователя",
    "site.displayName": "Отображаемое имя",
    "site.bio": "О себе",
    "site.manifesto": "Манифест",
    "site.avatar": "Аватар",
    "site.avatarHint": "Загрузить фото (JPEG/PNG, макс. ~80 КБ)",
    "site.socials": "Социальные сети",
    "site.telegram": "Telegram",
    "site.twitter": "Twitter / X",
    "site.website": "Сайт",
    "site.preview": "Предпросмотр",
    "site.submit": "Создать вечный сайт",
    "site.submitting": "⏳ Генерация...",
    "site.limitReached": "🔒 Лимит обновлений исчерпан",
    "site.noTier": "Оформите подписку для создания вечного сайта",
    "site.updatesUsed": "обновлений использовано",
    "site.permanent": "Ваш сайт навсегда сохранён на Arweave",
    "site.updatesThisPeriod": "обновлений в этом периоде",

    // Buy page
    "buy.back": "← Назад в кабинет",
    "buy.title": "Подтверждение оплаты",
    "buy.subtitle": "Проверьте детали перед оплатой",
    "buy.distribution": "Распределение средств",
    "buy.wallet": "Кошелёк",
    "buy.balance": "Баланс",
    "buy.confirm": "Оплатить — $",
    "buy.preparing": "Подготовка кошелька...",
    "buy.loadingBalance": "Загрузка баланса...",
    "buy.funding": "Пополнение кошелька...",
    "buy.registering": "Регистрация в сети...",
    "buy.processing": "Обработка платежа...",
    "buy.step.funding": "Пополнение",
    "buy.step.registering": "Регистрация",
    "buy.step.payment": "Оплата",
    "buy.devnet": "Solana devnet · тестовый USDC · реальных средств нет",
    "buy.tryAgain": "Попробовать снова",
    "buy.openAifa": "Открыть терминал AIfa",

    // Buy — success
    "buy.success.title": "Оплата подтверждена!",
    "buy.success.sub": "Ваш сайт генерируется на Arweave",
    "buy.success.access": "Доступ активирован",
    "buy.success.cabinet": "В кабинет",

    // Buy — benefits
    "buy.benefit.pdf": "PDF-гид",
    "buy.benefit.referral": "Личная реферальная ссылка",
    "buy.benefit.aifa30": "Чат с AIfa (30 дней)",
    "buy.benefit.fromSpark": "Всё из Искры",
    "buy.benefit.arweave": "Вечный сайт на Arweave",
    "buy.benefit.cnft": "cNFT-паспорт",
    "buy.benefit.aifa90": "Чат с AIfa (90 дней)",
    "buy.benefit.fromArchives": "Всё из Семейного архива",
    "buy.benefit.voice": "Клон голоса",
    "buy.benefit.avatar3d": "3D-аватар",
    "buy.benefit.aifa365": "Чат с AIfa (365 дней)",
    "buy.benefit.vip": "VIP в DAO",

    // Games tab
    "games.title": "Арена игр",
    "games.subtitle": "Играй против AIfa — твоего ИИ-компаньона",
    "games.chess": "Шахматы",
    "games.chess.desc": "Классические шахматы с AIfa",
    "games.ttt": "Крестики-нолики",
    "games.ttt.desc": "Непобедимый ИИ",
    "games.checkers": "Шашки",
    "games.checkers.desc": "Обязательные взятия",
    "games.backgammon": "Нарды",
    "games.backgammon.desc": "Бросай кости и выбивай",

    // Site — errors
    "site.usernameTaken": "Это имя пользователя уже занято. Выберите другое.",
  },

  es: {
    // Login
    "login.tagline": "Tu memoria vive para siempre",
    "login.sub": "Sitio eterno en Arweave. Prueba de Alma en Solana.",
    "login.cta": "Entrar a la Familia",

    // Header
    "header.logout": "Salir",

    // Tabs
    "tab.cabinet": "Gabinete",
    "tab.aifa": "Terminal AIfa",
    "tab.games": "Juegos",
    "tab.dao": "DAO",
    "tab.site": "Sitio",
    "tab.contract": "Contrato",
    "tab.metrics": "Métricas",

    // Tier names
    "tier.spark": "Chispa",
    "tier.archives": "Archivos Familiares",
    "tier.dna": "ADN Digital",
    "tier.none": "Sin nivel",

    // Cabinet — eternal site panel
    "cabinet.site.label": "Sitio Eterno",
    "cabinet.site.live": "✓ En vivo en Arweave",
    "cabinet.site.failed": "✕ Error de generación",
    "cabinet.site.generating": "⟳ Generando…",
    "cabinet.site.pending": "⟳ Pendiente…",
    "cabinet.site.openPassport": "Abrir Pasaporte →",
    "cabinet.site.viewArweave": "Ver en Arweave →",

    // Cabinet — stats
    "cabinet.stats.burned": "$CODE Quemado",
    "cabinet.stats.members": "Miembros Activos",
    "cabinet.stats.sites": "Sitios Creados",

    // Cabinet — income
    "cabinet.income.title": "💰 Mis Ingresos",
    "cabinet.income.earned": "ganado en referidos",
    "cabinet.income.locked": "bloqueado",
    "cabinet.income.lockedHint": "Habrías ganado esto con una suscripción activa",
    "cabinet.income.renew": "Renovar →",
    "cabinet.income.copyLink": "Copiar enlace de referido",
    "cabinet.income.copied": "¡Copiado!",
    "cabinet.income.noEarnings": "Aún no hay ingresos por referidos",

    // Cabinet — plan
    "cabinet.plan.title": "🏆 Tu Plan",
    "cabinet.plan.active": "✓ Activo",
    "cabinet.plan.expired": "✕ Expirado",
    "cabinet.plan.daysLeft": "d restantes",
    "cabinet.plan.upgrade": "Mejorar",
    "cabinet.plan.activeUntil": "Activo hasta",
    "cabinet.plan.expiredOn": "Expiró",

    // Cabinet — expiry banner
    "cabinet.expiry.title": "⚠️ Suscripción expirada",
    "cabinet.expiry.desc": "La edición del sitio está bloqueada. Renueva para desbloquear.",
    "cabinet.expiry.cta": "Renovar ahora →",

    // Cabinet — tiers
    "cabinet.tiers.title": "🏆 Elige tu nivel de acceso",

    // Cabinet — top contributors
    "cabinet.top.title": "🏆 Mejores Contribuyentes",

    // Cabinet — recent txns
    "cabinet.txns.title": "Transacciones Recientes",
    "cabinet.txns.confirmed": "✅ Confirmado",
    "cabinet.txns.error": "❌ Error",
    "cabinet.txns.pending": "⏳ Pendiente",

    // Site tab — form
    "site.title": "Crea tu Sitio Eterno",
    "site.username": "Nombre de usuario",
    "site.displayName": "Nombre visible",
    "site.bio": "Biografía",
    "site.manifesto": "Manifiesto",
    "site.avatar": "Avatar",
    "site.avatarHint": "Subir foto (JPEG/PNG, máx. ~80 KB)",
    "site.socials": "Redes Sociales",
    "site.telegram": "Telegram",
    "site.twitter": "Twitter / X",
    "site.website": "Sitio web",
    "site.preview": "Vista previa",
    "site.submit": "Crear Sitio Eterno",
    "site.submitting": "⏳ Generando...",
    "site.limitReached": "🔒 Límite de actualizaciones alcanzado",
    "site.noTier": "Compra una suscripción para crear tu sitio eterno",
    "site.updatesUsed": "actualizaciones usadas",
    "site.permanent": "Tu sitio está guardado permanentemente en Arweave",
    "site.updatesThisPeriod": "actualizaciones este período",

    // Buy page
    "buy.back": "← Volver al gabinete",
    "buy.title": "Confirmación de Pago",
    "buy.subtitle": "Revisa los detalles antes de pagar",
    "buy.distribution": "Distribución de Fondos",
    "buy.wallet": "Billetera",
    "buy.balance": "Saldo",
    "buy.confirm": "Confirmar pago — $",
    "buy.preparing": "Preparando billetera...",
    "buy.loadingBalance": "Cargando saldo...",
    "buy.funding": "Financiando billetera...",
    "buy.registering": "Registrando en cadena...",
    "buy.processing": "Procesando pago...",
    "buy.step.funding": "Financiar billetera",
    "buy.step.registering": "Registrar",
    "buy.step.payment": "Pago",
    "buy.devnet": "Solana devnet · USDC de prueba · sin fondos reales",
    "buy.tryAgain": "Intentar de nuevo",
    "buy.openAifa": "Abrir Terminal AIfa",

    // Buy — success
    "buy.success.title": "¡Pago Confirmado!",
    "buy.success.sub": "Tu sitio se está generando en Arweave",
    "buy.success.access": "Acceso activado",
    "buy.success.cabinet": "Ir al Gabinete",

    // Buy — benefits
    "buy.benefit.pdf": "Guía PDF",
    "buy.benefit.referral": "Enlace de referido personal",
    "buy.benefit.aifa30": "Chat con AIfa (30 días)",
    "buy.benefit.fromSpark": "Todo de Chispa",
    "buy.benefit.arweave": "Sitio eterno en Arweave",
    "buy.benefit.cnft": "Pasaporte cNFT",
    "buy.benefit.aifa90": "Chat con AIfa (90 días)",
    "buy.benefit.fromArchives": "Todo de Archivos",
    "buy.benefit.voice": "Clon de voz",
    "buy.benefit.avatar3d": "Avatar 3D",
    "buy.benefit.aifa365": "Chat con AIfa (365 días)",
    "buy.benefit.vip": "VIP en DAO",

    // Games tab
    "games.title": "Arena de Juegos",
    "games.subtitle": "Juega contra AIfa — tu compañero IA",
    "games.chess": "Ajedrez",
    "games.chess.desc": "Ajedrez clásico vs AIfa",
    "games.ttt": "Tres en Raya",
    "games.ttt.desc": "IA minimax perfecta",
    "games.checkers": "Damas",
    "games.checkers.desc": "Capturas obligatorias",
    "games.backgammon": "Backgammon",
    "games.backgammon.desc": "Tira y saca",

    // Site — errors
    "site.usernameTaken": "Este nombre de usuario ya está en uso. Elige otro.",
  },

  zh: {
    // Login
    "login.tagline": "你的记忆永远存在",
    "login.sub": "Arweave永久站点，Solana灵魂证明。",
    "login.cta": "加入家族",

    // Header
    "header.logout": "退出",

    // Tabs
    "tab.cabinet": "主页",
    "tab.aifa": "AIfa终端",
    "tab.games": "游戏",
    "tab.dao": "DAO",
    "tab.site": "站点",
    "tab.contract": "智能合约",
    "tab.metrics": "数据",

    // Tier names
    "tier.spark": "星火",
    "tier.archives": "家族档案",
    "tier.dna": "数字DNA",
    "tier.none": "无等级",

    // Cabinet — eternal site panel
    "cabinet.site.label": "永久站点",
    "cabinet.site.live": "✓ 已上线 Arweave",
    "cabinet.site.failed": "✕ 生成失败",
    "cabinet.site.generating": "⟳ 生成中…",
    "cabinet.site.pending": "⟳ 等待中…",
    "cabinet.site.openPassport": "打开护照 →",
    "cabinet.site.viewArweave": "在 Arweave 查看 →",

    // Cabinet — stats
    "cabinet.stats.burned": "已销毁 $CODE",
    "cabinet.stats.members": "活跃成员",
    "cabinet.stats.sites": "已创建站点",

    // Cabinet — income
    "cabinet.income.title": "💰 我的收益",
    "cabinet.income.earned": "推荐总收益",
    "cabinet.income.locked": "已锁定",
    "cabinet.income.lockedHint": "订阅有效时可获得此收益",
    "cabinet.income.renew": "续订 →",
    "cabinet.income.copyLink": "复制推荐链接",
    "cabinet.income.copied": "已复制！",
    "cabinet.income.noEarnings": "暂无推荐收益",

    // Cabinet — plan
    "cabinet.plan.title": "🏆 我的套餐",
    "cabinet.plan.active": "✓ 有效",
    "cabinet.plan.expired": "✕ 已过期",
    "cabinet.plan.daysLeft": "天剩余",
    "cabinet.plan.upgrade": "升级",
    "cabinet.plan.activeUntil": "有效至",
    "cabinet.plan.expiredOn": "已过期",

    // Cabinet — expiry banner
    "cabinet.expiry.title": "⚠️ 订阅已过期",
    "cabinet.expiry.desc": "站点编辑已锁定，续订以解锁全部功能。",
    "cabinet.expiry.cta": "立即续订 →",

    // Cabinet — tiers
    "cabinet.tiers.title": "🏆 选择访问级别",

    // Cabinet — top contributors
    "cabinet.top.title": "🏆 顶级贡献者",

    // Cabinet — recent txns
    "cabinet.txns.title": "最近交易",
    "cabinet.txns.confirmed": "✅ 已确认",
    "cabinet.txns.error": "❌ 错误",
    "cabinet.txns.pending": "⏳ 等待中",

    // Site tab — form
    "site.title": "创建你的永久站点",
    "site.username": "用户名",
    "site.displayName": "显示名称",
    "site.bio": "个人简介",
    "site.manifesto": "宣言",
    "site.avatar": "头像",
    "site.avatarHint": "上传照片（JPEG/PNG，最大约80KB）",
    "site.socials": "社交链接",
    "site.telegram": "Telegram",
    "site.twitter": "Twitter / X",
    "site.website": "网站",
    "site.preview": "预览",
    "site.submit": "创建永久站点",
    "site.submitting": "⏳ 生成中...",
    "site.limitReached": "🔒 已达更新上限",
    "site.noTier": "购买订阅以创建永久站点",
    "site.updatesUsed": "次更新已使用",
    "site.permanent": "你的站点已永久保存在 Arweave",
    "site.updatesThisPeriod": "本周期更新次数",

    // Buy page
    "buy.back": "← 返回主页",
    "buy.title": "确认支付",
    "buy.subtitle": "支付前请核实详情",
    "buy.distribution": "资金分配",
    "buy.wallet": "钱包",
    "buy.balance": "余额",
    "buy.confirm": "确认支付 — $",
    "buy.preparing": "准备钱包...",
    "buy.loadingBalance": "加载余额...",
    "buy.funding": "充值钱包...",
    "buy.registering": "链上注册...",
    "buy.processing": "处理支付...",
    "buy.step.funding": "充值钱包",
    "buy.step.registering": "注册",
    "buy.step.payment": "支付",
    "buy.devnet": "Solana 测试网 · 测试 USDC · 非真实资金",
    "buy.tryAgain": "重试",
    "buy.openAifa": "打开 AIfa 终端",

    // Buy — success
    "buy.success.title": "支付已确认！",
    "buy.success.sub": "你的站点正在 Arweave 上生成",
    "buy.success.access": "访问已激活",
    "buy.success.cabinet": "进入主页",

    // Buy — benefits
    "buy.benefit.pdf": "PDF 指南",
    "buy.benefit.referral": "个人推荐链接",
    "buy.benefit.aifa30": "AIfa 聊天（30天）",
    "buy.benefit.fromSpark": "包含星火全部权益",
    "buy.benefit.arweave": "Arweave 永久站点",
    "buy.benefit.cnft": "cNFT 护照",
    "buy.benefit.aifa90": "AIfa 聊天（90天）",
    "buy.benefit.fromArchives": "包含家族档案全部权益",
    "buy.benefit.voice": "声音克隆",
    "buy.benefit.avatar3d": "3D 头像",
    "buy.benefit.aifa365": "AIfa 聊天（365天）",
    "buy.benefit.vip": "DAO VIP",

    // Games tab
    "games.title": "游戏竞技场",
    "games.subtitle": "与你的AI伙伴AIfa对战",
    "games.chess": "国际象棋",
    "games.chess.desc": "经典象棋对决AIfa",
    "games.ttt": "井字棋",
    "games.ttt.desc": "完美极小化极大AI",
    "games.checkers": "跳棋",
    "games.checkers.desc": "强制吃子",
    "games.backgammon": "双陆棋",
    "games.backgammon.desc": "掷骰撤棋",

    // Site — errors
    "site.usernameTaken": "用户名已被占用，请选择其他用户名。",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Lang): string {
  return (translations[lang] as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
}

interface LangStore {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLang = create<LangStore>()(
  persist(
    (set) => ({ lang: "en", setLang: (lang) => set({ lang }) }),
    { name: "ce-lang" }
  )
);
