// Функция для добавления уведомления на экран
function showMessage(text) {
    const existingMsg = document.getElementById('userMessage');
    if (existingMsg) existingMsg.remove();

    const msg = document.createElement('div');
    msg.id = 'userMessage';
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// Основная функция для создания и сохранения скриншота
document.addEventListener('DOMContentLoaded', function () {
    const shotButton = document.getElementById('ShotButton');

    // Настройка кнопки, если она пустая
    if (shotButton) {
    }

    // Обработчик нажатия на кнопку
    shotButton.addEventListener('click', function () {
        // 1. Пытаемся найти основной canvas AR-сцены
        const sceneCanvas = document.querySelector('a-scene').canvas;
        let targetCanvas = sceneCanvas;

        // Если canvas сцены не найден, ищем любой другой подходящий
        if (!targetCanvas) {
            const allCanvases = document.querySelectorAll('canvas');
            for (let canvas of allCanvases) {
                if (canvas.width > 200 && canvas.height > 200) {
                    targetCanvas = canvas;
                    break;
                }
            }
        }

        if (!targetCanvas) {
            showMessage('Не удалось найти изображение AR-сцены');
            return;
        }

        // 2. Создаем временный canvas и копируем данные
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetCanvas.width;
        tempCanvas.height = targetCanvas.height;
        const ctx = tempCanvas.getContext('2d');

        // Заливаем белым фоном на случай прозрачности WebGL
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(targetCanvas, 0, 0);

        // 3. Конвертируем в Data URL
        const dataUrl = tempCanvas.toDataURL('image/png');

        // 4. Создаем временную ссылку для скачивания
        const downloadLink = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        downloadLink.download = `AR-НовыйГод-${timestamp}.png`;
        downloadLink.href = dataUrl;

        // 5. Инициируем скачивание
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // 6. Показываем инструкции для пользователя
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        if (isIOS) {
            showMessage('Фото создано! Нажмите «Поделиться» → «Сохранить в Фото»');
        } else if (isAndroid) {
            showMessage('Фото создано! Сохраните его из папки «Загрузки»');
        } else {
            showMessage('Скриншот сохранен в загрузки!');
        }

        // 7. Виброотклик для мобильных устройств (если поддерживается)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    });
});