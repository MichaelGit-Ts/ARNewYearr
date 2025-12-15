document.addEventListener('DOMContentLoaded', function () {
    const ShotButton = document.getElementById('ShotButton');
    const sceneEl = document.querySelector('a-scene');

    if (!sceneEl) {
        console.error('A-Frame сцена не найдена!');
        return;
    }

    // Ждем полной загрузки сцены
    sceneEl.addEventListener('loaded', function () {
        console.log('AR сцена загружена');
        setupScreenShotButton();
    });

    function setupScreenShotButton() {
        if (!ShotButton) return;

        ShotButton.addEventListener('click', captureARScreenshot);
    }

    function captureARScreenshot() {
        try {
            // Находим все canvas элементы
            const canvases = document.querySelectorAll('canvas');
            let videoCanvas = null;
            let sceneCanvas = null;

            // Ищем canvas с видео (самый большой и не пустой)
            canvases.forEach(canvas => {
                if (canvas.width > 300 && canvas.height > 300) {
                    if (!videoCanvas) {
                        videoCanvas = canvas;
                    }
                    // Canvas A-Frame сцены
                    if (canvas === sceneEl.canvas) {
                        sceneCanvas = canvas;
                    }
                }
            });

            // Если не нашли видео canvas, используем первый подходящий
            if (!videoCanvas) {
                videoCanvas = sceneCanvas || canvases[0];
            }

            if (!videoCanvas) {
                throw new Error('Не найден canvas с AR-изображением');
            }

            // Создаем финальный canvas
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = videoCanvas.width;
            finalCanvas.height = videoCanvas.height;
            const ctx = finalCanvas.getContext('2d');

            // Копируем видео с камеры
            ctx.drawImage(videoCanvas, 0, 0);

            // Добавляем 3D-модель поверх видео (если есть отдельный canvas)
            if (sceneCanvas && sceneCanvas !== videoCanvas) {
                ctx.drawImage(sceneCanvas, 0, 0);
            }

            // Создаем Data URL
            const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
            downloadImage(dataUrl);

        } catch (error) {
            console.error('Ошибка при создании скриншота:', error);
            alert('Ошибка при создании скриншота: ' + error.message);
        }
    }

    function downloadImage(dataUrl) {
        const link = document.createElement('a');
        const timestamp = new Date().toLocaleString('ru-RU')
            .replace(/[/:]/g, '-')
            .replace(', ', '_');

        link.download = `AR_Новый_Год_${timestamp}.jpg`;
        link.href = dataUrl;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Инструкция для пользователя
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        if (isIOS) {
            alert('Фото готово! В открывшейся вкладке нажмите "Поделиться" → "Сохранить в Фото"');
        } else if (isAndroid) {
            alert('Фото сохранено в загрузки!');
        } else {
            alert('Скриншот сохранен!');
        }
    }
});