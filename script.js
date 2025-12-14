// Проверяем мобильное устройство
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Элементы DOM
const screenshotBtn = document.getElementById('ShotButton');

// Состояние
let isProcessing = false;

// Инициализация для мобильных устройств
function initMobileAR() {
    // Запрашиваем разрешение на камеру
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function (stream) {
                console.log('Доступ к камере разрешен');
                showNotification('AR сцена готова!', 3000);
            })
            .catch(function (error) {
                console.error('Ошибка доступа к камере:', error);
                showNotification('Необходим доступ к камере', 5000);
            });
    }

    // Настройка touch-событий
    setupTouchEvents();

    // Предотвращение зума по двойному тапу
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    // Информация об ориентации
    window.addEventListener('orientationchange', function () {
        showNotification('Поверните устройство для лучшего обзора', 2000);
    });
}

// Настройка touch-событий
function setupTouchEvents() {
    // Для мобильных используем touchstart вместо click
    const eventType = isMobile ? 'touchstart' : 'click';

    screenshotBtn.addEventListener(eventType, function (e) {
        if (e.cancelable) e.preventDefault();

        if (isProcessing) {
            showNotification('Пожалуйста, подождите...', 2000);
            return;
        }

        captureMobileScreenshot();
    });

    // Предотвращаем долгое нажатие контекстного меню
    screenshotBtn.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });
}

// Захват скриншота для мобильных
async function captureMobileScreenshot() {
    isProcessing = true;
    showLoader(true);

    try {
        showNotification('Создаем скриншот...', 1000);

        // Ждем немного для стабильности
        await new Promise(resolve => setTimeout(resolve, 100));

        // Получаем canvas сцены
        const scene = document.querySelector('a-scene');
        const canvas = getARCanvas();

        if (!canvas) {
            throw new Error('Не удалось найти AR-канвас');
        }

        // Создаем временный canvas
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');

        // Устанавливаем размеры
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        // Для iOS: иногда нужно залить фон
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Копируем содержимое
        ctx.drawImage(canvas, 0, 0);

        // Получаем Data URL
        const dataURL = tempCanvas.toDataURL('image/jpeg', 0.9); // JPEG для меньшего размера

        // Сохраняем или делиимся
        await saveOrShareImage(dataURL);

        showNotification('Скриншот сохранен! ✓', 3000);

    } catch (error) {
        console.error('Ошибка при создании скриншота:', error);
        showNotification('Ошибка: ' + error.message, 4000);
    } finally {
        isProcessing = false;
        showLoader(false);
    }
}

// Поиск правильного canvas для AR.js
function getARCanvas() {
    // Пробуем разные способы найти canvas
    const canvases = document.querySelectorAll('canvas');

    for (let canvas of canvases) {
        // Ищем canvas с подходящими размерами (не слишком маленький)
        if (canvas.width > 300 && canvas.height > 300) {
            return canvas;
        }
    }

    // Если не нашли, берем первый
    return canvases[0] || document.querySelector('a-scene').canvas;
}

// Сохранение или шаринг изображения
async function saveOrShareImage(dataURL) {
    // Проверяем поддержку Web Share API
    if (navigator.share && isMobile) {
        try {
            // Конвертируем Data URL в Blob
            const blob = await dataURLtoBlob(dataURL);
            const file = new File([blob], 'ar-screenshot.jpg', { type: 'image/jpeg' });

            // Пытаемся использовать Web Share API
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'AR Скриншот',
                    text: 'Смотрите мой AR скриншот!'
                });
                return;
            }
        } catch (shareError) {
            console.log('Web Share не поддерживается:', shareError);
            // Продолжаем с обычным сохранением
        }
    }

    // Обычное сохранение
    saveImage(dataURL);
}

// Сохранение изображения (фолбэк)
function saveImage(dataURL) {
    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    link.download = `ar-${Date.now()}.jpg`;
    link.href = dataURL;

    // Для iOS: нужно добавить в DOM
    document.body.appendChild(link);

    // Симулируем клик
    const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });

    link.dispatchEvent(clickEvent);

    // Удаляем ссылку
    setTimeout(() => {
        document.body.removeChild(link);
    }, 100);

    // Для iOS Safari может потребоваться дополнительное действие
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        showNotification('Нажмите "Поделиться" для сохранения', 3000);
    }
}

// Конвертация Data URL в Blob
function dataURLtoBlob(dataURL) {
    return new Promise((resolve, reject) => {
        const parts = dataURL.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        resolve(new Blob([uInt8Array], { type: contentType }));
    });
}

// Показать/скрыть loader
function showLoader(show) {
    loader.style.display = show ? 'block' : 'none';
}

// Показать уведомление
function showNotification(message, duration = 3000) {
    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, duration);
}

// Инициализация при загрузке
window.addEventListener('load', function () {
    // Задержка для инициализации AR
    setTimeout(() => {
        initMobileAR();

        // Первое уведомление
        showNotification('Наведите камеру на маркер Hiro', 4000);
    }, 2000);
});

// Обработка ошибок AR
document.querySelector('a-scene').addEventListener('arjs-video-loaded', function () {
    console.log('AR видео загружено');
});

// Предотвращение выключения экрана
if ('wakeLock' in navigator) {
    let wakeLock = null;

    const requestWakeLock = async () => {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock активирован');
        } catch (err) {
            console.error('Wake Lock не поддерживается:', err);
        }
    };

    requestWakeLock();

    // Восстанавливаем при возвращении на вкладку
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && wakeLock === null) {
            await requestWakeLock();
        }
    });
}