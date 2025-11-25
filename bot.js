const { Telegraf } = require('telegraf');
const { Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();

// Настройки бота
const BOT_TOKEN = 'YOUR_BOT_TOKEN';

// Инициализация бота
const bot = new Telegraf(BOT_TOKEN);

// База данных
const db = new sqlite3.Database('./autoservice.db');

// Создание таблиц
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price_min INTEGER NOT NULL,
        price_max INTEGER,
        duration_min INTEGER NOT NULL,
        duration_max INTEGER,
        category TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        datetime TEXT NOT NULL,
        car_model TEXT NOT NULL,
        car_year TEXT NOT NULL,
        problem_description TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mechanics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialty TEXT NOT NULL,
        phone TEXT NOT NULL,
        is_available BOOLEAN DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS work_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mechanic_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time_slots TEXT NOT NULL, -- JSON array
        is_booked BOOLEAN DEFAULT 0,
        FOREIGN KEY (mechanic_id) REFERENCES mechanics (id),
        FOREIGN KEY (service_id) REFERENCES services (id)
    )`);
});

// Добавление тестовых услуг
const insertServices = () => {
    const services = [
        { name: 'Диагностика', description: 'Полная диагностика двигателя и систем автомобиля', price_min: 1500, price_max: 3000, duration_min: 60, duration_max: 120, category: 'Диагностика' },
        { name: 'Замена масла', description: 'Замена масла и фильтров', price_min: 800, price_max: 1200, duration_min: 30, duration_max: 45, category: 'Обслуживание' },
        { name: 'Тормозная система', description: 'Замена тормозных колодок и дисков', price_min: 2000, price_max: 5000, duration_min: 90, duration_max: 180, category: 'Тормоза' },
        { name: 'Подвеска', description: 'Ремонт подвески и амортизаторов', price_min: 3000, price_max: 8000, duration_min: 180, duration_max: 360, category: 'Подвеска' },
        { name: 'КПП', description: 'Ремонт коробки передач', price_min: 5000, price_max: 15000, duration_min: 240, duration_max: 480, category: 'КПП' },
        { name: 'Двигатель', description: 'Капитальный ремонт двигателя', price_min: 20000, price_max: 50000, duration_min: 480, duration_max: 960, category: 'Двигатель' },
        { name: 'Электрика', description: 'Ремонт электрооборудования', price_min: 1000, price_max: 4000, duration_min: 60, duration_max: 180, category: 'Электрика' },
        { name: 'Кузовные работы', description: 'Ремонт кузова и покраска', price_min: 5000, price_max: 30000, duration_min: 240, duration_max: 960, category: 'Кузов' }
    ];

    services.forEach(service => {
        db.run(
            'INSERT OR IGNORE INTO services (name, description, price_min, price_max, duration_min, duration_max, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [service.name, service.description, service.price_min, service.price_max, service.duration_min, service.duration_max, service.category]
        );
    });
};

// Добавление механиков
const insertMechanics = () => {
    const mechanics = [
        { name: 'Иван Петров', specialty: 'Двигатель, КПП', phone: '+7 (999) 111-22-33' },
        { name: 'Алексей Сидоров', specialty: 'Подвеска, Тормоза', phone: '+7 (999) 222-33-44' },
        { name: 'Михаил Козлов', specialty: 'Электрика, Диагностика', phone: '+7 (999) 333-44-55' },
        { name: 'Дмитрий Волков', specialty: 'Кузов, Покраска', phone: '+7 (999) 444-55-66' }
    ];

    mechanics.forEach(mechanic => {
        db.run(
            'INSERT OR IGNORE INTO mechanics (name, specialty, phone) VALUES (?, ?, ?)',
            [mechanic.name, mechenic.specialty, mechanic.phone]
        );
    });
};

insertServices();
insertMechanics();

// Функции для работы с БД
const getServices = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM services', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getCategories = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT DISTINCT category FROM services', (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => row.category));
        });
    });
};

const getServiceById = (id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM services WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const createAppointment = (userId, serviceId, datetime, carModel, carYear, problemDescription, customerName, customerPhone, customerEmail = null) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO appointments (user_id, service_id, datetime, car_model, car_year, problem_description, customer_name, customer_phone, customer_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, serviceId, datetime, carModel, carYear, problemDescription, customerName, customerPhone, customerEmail],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

const getUserAppointments = (userId) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT a.*, s.name as service_name, s.category 
             FROM appointments a 
             JOIN services s ON a.service_id = s.id 
             WHERE a.user_id = ? 
             ORDER BY a.datetime DESC`,
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

const getAvailableMechanics = (serviceId) => {
    return new Promise((resolve, reject) => {
        // Простая логика - любой доступный механик
        db.all(
            'SELECT * FROM mechanics WHERE is_available = 1',
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

// Команды бота
bot.start(async (ctx) => {
    await ctx.reply(
        '🚗 Добро пожаловать в автосервис!\n\nПрофессиональный ремонт любой сложности. Записывайтесь онлайн!',
        Markup.keyboard([
            ['🔧 Услуги', '📅 Записаться'],
            ['📊 Мои записи', 'ℹ️ О нас']
        ]).resize()
    );
});

bot.hears('🔧 Услуги', async (ctx) => {
    try {
        const services = await getServices();
        let message = '🔧 НАШИ УСЛУГИ:\n\n';
        
        services.forEach(service => {
            message += `• ${service.name}\n`;
            message += `  💰 ${service.price_min}₽`;
            if (service.price_max && service.price_max !== service.price_min) {
                message += `-${service.price_max}₽`;
            }
            message += `\n  ⏱️ ${service.duration_min}мин`;
            if (service.duration_max && service.duration_max !== service.duration_min) {
                message += `-${service.duration_max}мин`;
            }
            message += `\n  📝 ${service.description}\n\n`;
        });
        
        await ctx.reply(message);
    } catch (error) {
        await ctx.reply('❌ Ошибка при получении списка услуг');
    }
});

bot.hears('📅 Записаться', async (ctx) => {
    try {
        const categories = await getCategories();
        const keyboard = categories.map(cat => [`${cat} (${categories.indexOf(cat) + 1})`]);
        keyboard.push(['🏠 Главное меню']);
        
        await ctx.reply(
            '📅 ВЫБЕРИТЕ КАТЕГОРИЮ УСЛУГ:',
            Markup.keyboard(keyboard).resize()
        );
    } catch (error) {
        await ctx.reply('❌ Ошибка при загрузке категорий');
    }
});

// Обработка выбора категории
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    if (text.includes('🏠 Главное меню')) {
        await ctx.reply(
            'Главное меню:',
            Markup.keyboard([
                ['🔧 Услуги', '📅 Записаться'],
                ['📊 Мои записи', 'ℹ️ О нас']
            ]).resize()
        );
        return;
    }
    
    // Проверяем, является ли текст номером категории
    const match = text.match(/(\d+)\)/);
    if (match) {
        try {
            const categoryIndex = parseInt(match[1]) - 1;
            const categories = await getCategories();
            
            if (categoryIndex >= 0 && categoryIndex < categories.length) {
                const selectedCategory = categories[categoryIndex];
                const services = await getServices();
                const categoryServices = services.filter(service => service.category === selectedCategory);
                
                if (categoryServices.length === 0) {
                    await ctx.reply(`❌ В категории "${selectedCategory}" пока нет услуг`);
                    return;
                }
                
                const keyboard = categoryServices.map((service, index) => [`${index + 1}. ${service.name}`]);
                keyboard.push(['🔧 Услуги', '📅 Записаться']);
                
                let message = `🔧 ${selectedCategory.toUpperCase()}\n\n`;
                categoryServices.forEach((service, index) => {
                    message += `${index + 1}. ${service.name}\n`;
                    message += `   💰 ${service.price_min}₽`;
                    if (service.price_max && service.price_max !== service.price_min) {
                        message += `-${service.price_max}₽`;
                    }
                    message += `\n   ⏱️ ${service.duration_min}мин`;
                    if (service.duration_max && service.duration_max !== service.duration_min) {
                        message += `-${service.duration_max}мин`;
                    }
                    message += `\n\n`;
                });
                
                await ctx.reply(
                    message,
                    Markup.keyboard(keyboard).resize()
                );
                
                // Сохраняем выбранные услуги в сессию
                ctx.session = ctx.session || {};
                ctx.session.categoryServices = categoryServices;
                ctx.session.selectedCategory = selectedCategory;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
});

// Обработка выбора услуги
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const categoryServices = ctx.session?.categoryServices;
    
    if (categoryServices) {
        const match = text.match(/^(\d+)\./);
        if (match) {
            const serviceIndex = parseInt(match[1]) - 1;
            
            if (serviceIndex >= 0 && serviceIndex < categoryServices.length) {
                const selectedService = categoryServices[serviceIndex];
                
                await ctx.reply(
                    `🔧 ${selectedService.name}\n\n` +
                    `📝 ${selectedService.description}\n\n` +
                    `💰 Стоимость: ${selectedService.price_min}₽`;
                    if (selectedService.price_max && selectedService.price_max !== selectedService.price_min) {
                        message += `-${selectedService.price_max}₽`;
                    }
                    message += `\n⏱️ Время: ${selectedService.duration_min}мин`;
                    if (selectedService.duration_max && selectedService.duration_max !== selectedService.duration_min) {
                        message += `-${selectedService.duration_max}мин`;
                    }
                    message += `\n\n` +
                    `📅 Введите желаемую дату записи (ДД.ММ.ГГГГ):\n` +
                    `(например, 26.11.2025)`,
                    Markup.keyboard([['🔙 Назад']]).resize()
                );
                
                ctx.session = ctx.session || {};
                ctx.session.selectedService = selectedService;
                ctx.session.step = 'date';
            }
        }
    }
});

// Обработка даты записи
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const service = ctx.session?.selectedService;
    
    if (text.includes('🔙 Назад')) {
        await ctx.reply(
            'Выберите услугу:',
            Markup.keyboard(ctx.session.categoryServices.map((service, index) => [`${index + 1}. ${service.name}`]))
                .push(['🔧 Услуги', '📅 Записаться'])
                .resize()
        );
        ctx.session.step = 'service';
        return;
    }
    
    if (service && text.match(/\d{2}\.\d{2}\.\d{4}/)) {
        const selectedDate = text;
        
        // Генерируем временные слоты (работаем с 9:00 до 18:00)
        const times = [];
        for (let hour = 9; hour < 18; hour++) {
            times.push(`${hour}:00`);
            if (hour < 17) times.push(`${hour}:30`);
        }
        
        const keyboard = times.map(time => [`${selectedDate} ${time}`]);
        keyboard.push(['🔙 Назад']);
        
        await ctx.reply(
            `📅 Выбранная дата: ${selectedDate}\n\n⏰ ВЫБЕРИТЕ ВРЕМЯ:`,
            Markup.keyboard(keyboard).resize()
        );
        
        ctx.session = ctx.session || {};
        ctx.session.selectedDate = selectedDate;
        ctx.session.step = 'time';
    }
});

// Обработка времени записи
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const service = ctx.session?.selectedService;
    const date = ctx.session?.selectedDate;
    
    if (service && date && text.match(/\d{2}\.\d{2}\.\d{4}\s\d{1,2}:\d{2}/)) {
        const datetime = text;
        
        await ctx.reply(
            `✅ Выбрано время: ${datetime}\n\n` +
            `🚗 Введите марку и модель автомобиля:\n` +
            `(например, ВАЗ 2114)`,
            Markup.keyboard([['🔙 Назад']]).resize()
        );
        
        ctx.session = ctx.session || {};
        ctx.session.selectedDatetime = datetime;
        ctx.session.step = 'car';
    }
});

// Обработка марки автомобиля
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const service = ctx.session?.selectedService;
    const datetime = ctx.session?.selectedDatetime;
    
    if (service && datetime && text.length > 2 && !text.includes('🔙 Назад')) {
        const carModel = text;
        
        await ctx.reply(
            `🚗 Автомобиль: ${carModel}\n\n` +
            `📅 Год выпуска автомобиля:\n` +
            `(например, 2015)`,
            Markup.keyboard([['🔙 Назад']]).resize()
        );
        
        ctx.session = ctx.session || {};
        ctx.session.carModel = carModel;
        ctx.session.step = 'year';
    }
});

// Обработка года выпуска
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const service = ctx.session?.selectedService;
    const carModel = ctx.session?.carModel;
    
    if (service && carModel && text.match(/^\d{4}$/) && parseInt(text) > 1900 && parseInt(text) <= new Date().getFullYear()) {
        const carYear = text;
        
        await ctx.reply(
            `🚗 Автомобиль: ${carModel} (${carYear})\n\n` +
            `📝 Опишите проблему:\n` +
            `Что беспокоит? Какие симптомы?`,
            Markup.keyboard([['🔙 Назад']]).resize()
        );
        
        ctx.session = ctx.session || {};
        ctx.session.carYear = carYear;
        ctx.session.step = 'problem';
    }
});

// Обработка описания проблемы
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const service = ctx.session?.selectedService;
    const carModel = ctx.session?.carModel;
    const carYear = ctx.session?.carYear;
    
    if (service && carModel && carYear && text.length > 10 && !text.includes('🔙 Назад')) {
        const problemDescription = text;
        
        await ctx.reply(
            `📝 Проблема описана\n\n` +
            `👤 Введите ваше имя:`,
            Markup.keyboard([['🔙 Назад']]).resize()
        );
        
        ctx.session = ctx.session || {};
        ctx.session.problemDescription = problemDescription;
        ctx.session.step = 'name';
    }
});

// Обработка имени клиента
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const service = ctx.session?.selectedService;
    const problem = ctx.session?.problemDescription;
    
    if (service && problem && text.length > 1 && !text.includes('🔙 Назад')) {
        const customerName = text;
        
        await ctx.reply(
            `👤 Имя: ${customerName}\n\n` +
            `📱 Введите номер телефона:`,
            Markup.keyboard([['🔙 Назад']]).resize()
        );
        
        ctx.session = ctx.session || {};
        ctx.session.customerName = customerName;
        ctx.session.step = 'phone';
    }
});

// Обработка телефона и создание записи
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const service = ctx.session?.selectedService;
    const datetime = ctx.session?.selectedDatetime;
    const carModel = ctx.session?.carModel;
    const carYear = ctx.session?.carYear;
    const problem = ctx.session?.problemDescription;
    const customerName = ctx.session?.customerName;
    
    if (service && datetime && carModel && carYear && problem && customerName && text.match(/\+?[78]?\d{10,}/)) {
        const customerPhone = text;
        
        try {
            const appointmentId = await createAppointment(
                ctx.from.id,
                service.id,
                datetime,
                carModel,
                carYear,
                problem,
                customerName,
                customerPhone
            );
            
            const mechanics = await getAvailableMechanics(service.id);
            const assignedMechanic = mechanics[Math.floor(Math.random() * mechanics.length)] || mechanics[0];
            
            await ctx.reply(
                `✅ ЗАПИСЬ СОЗДАНА!\n\n` +
                `🎫 Номер записи: #${appointmentId}\n` +
                `📅 Дата и время: ${datetime}\n` +
                `🚗 Автомобиль: ${carModel} (${carYear})\n` +
                `🔧 Услуга: ${service.name}\n` +
                `👤 Имя: ${customerName}\n` +
                `📱 Телефон: ${customerPhone}\n\n` +
                `🔧 Назначен мастер: ${assignedMechanic.name}\n` +
                `📞 Телефон мастера: ${assignedMechanic.phone}\n\n` +
                `💰 Примерная стоимость: ${service.price_min}₽`;
                if (service.price_max && service.price_max !== service.price_min) {
                    message += `-${service.price_max}₽`;
                }
                message += `\n\n` +
                `⚠️ Мастер свяжется с вами для уточнения деталей`,
                Markup.keyboard([
                    ['📊 Мои записи'],
                    ['🏠 Главное меню']
                ]).resize()
            );
            
            // Очищаем сессию
            ctx.session = {};
            
        } catch (error) {
            await ctx.reply('❌ Ошибка при создании записи. Попробуйте еще раз.');
        }
    }
});

// Просмотр записей пользователя
bot.hears('📊 Мои записи', async (ctx) => {
    try {
        const appointments = await getUserAppointments(ctx.from.id);
        
        if (appointments.length === 0) {
            await ctx.reply('📝 У вас пока нет записей');
            return;
        }
        
        let message = '📊 ВАШИ ЗАПИСИ:\n\n';
        appointments.forEach(appointment => {
            message += `🎫 Запись #${appointment.id}\n`;
            message += `📅 ${appointment.datetime}\n`;
            message += `🔧 ${appointment.service_name}\n`;
            message += `🚗 ${appointment.car_model} (${appointment.car_year})\n`;
            message += `📊 Статус: ${appointment.status}\n`;
            message += `👤 ${appointment.customer_name} - ${appointment.customer_phone}\n\n`;
        });
        
        await ctx.reply(message);
    } catch (error) {
        await ctx.reply('❌ Ошибка при получении записей');
    }
});

// О компании
bot.hears('ℹ️ О нас', async (ctx) => {
    await ctx.reply(
        'ℹ️ НАШ АВТОСЕРВИС\n\n' +
        '🔧 Профессиональный ремонт с 2015 года\n' +
        '🏆 Гарантия на все работы\n' +
        '🔩 Оригинальные запчасти\n' +
        '⚡ Быстрая диагностика\n' +
        '💳 Оплата по карте и наличными\n\n' +
        '📍 Адрес: ул. Автомобильная, д. 25\n' +
        '📞 Телефон: +7 (999) 123-45-67\n' +
        '⏰ Время работы: 9:00 - 18:00\n' +
        '📧 Email: info@autoservice.ru'
    );
});

// Обработка ошибок
bot.catch((err, ctx) => {
    console.log(`Error for ${ctx.updateType}:`, err);
});

// Запуск бота
bot.launch().then(() => {
    console.log('🚗 Бот автосервиса запущен...');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));