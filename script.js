document.addEventListener('DOMContentLoaded', function () {
    const shotButton = document.getElementById('ShotButton');
    const sceneEl = document.querySelector('a-scene');

    if (!shotButton || !sceneEl) return;

    // Ждем загрузки AR.js
    sceneEl.addEventListener('loaded', function () {
        console.log('AR сцена загружена');
        shotButton.addEventListener('click', captureARWithTimeout);
    });

    function captureARWithTimeout() {
        // Даем время на стабилизацию кадра
        setTimeout(captureARScreenshot, 100);
    }

    function captureARScreenshot() {
        try {
            console.log('Начинаем захват скриншота...');

            // 1. Ищем ВСЕ canvas, включая скрытые AR.js
            const allCanvases = Array.from(document.querySelectorAll('canvas'));
            console.log('Найдено canvas:', allCanvases.length);

            // 2. Фильтруем canvas по размеру (игнорируем мелкие)
            const arCanvases = allCanvases.filter(canvas => {
                return canvas.width > 100 && canvas.height > 100;
            });

            console.log('AR canvas (подходящие по размеру):', arCanvases.length);

            if (arCanvases.length === 0) {
                alert('Не найдены canvas с AR-контентом');
                return;
            }

            // 3. Пробуем разные стратегии захвата

            // Способ A: Используем canvas из A-Frame сцены
            if (sceneEl.canvas) {
                console.log('Используем canvas A-Frame сцены');
                saveCanvasImage(sceneEl.canvas);
                return;
            }

            // Способ B: Ищем canvas с наибольшей площадью (скорее всего видео)
            let largestCanvas = arCanvases[0];
            let maxArea = largestCanvas.width * largestCanvas.height;

            for (let i = 1; i < arCanvases.length; i++) {
                const area = arCanvases[i].width * arCanvases[i].height;
                if (area > maxArea) {
                    maxArea = area;
                    largestCanvas = arCanvases[i];
                }
            }

            console.log('Используем самый большой canvas:',
                largestCanvas.width, 'x', largestCanvas.height);

            // 4. Проверяем, не пустой ли canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 10;
            tempCanvas.height = 10;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(largestCanvas, 0, 0, 10, 10);
            const pixelData = tempCtx.getImageData(0, 0, 1, 1).data;

            console.log('Тестовый пиксель:', pixelData[0], pixelData[1], pixelData[2]);

            // Если все пиксели белые/черные - возможно canvas пустой
            const isWhite = pixelData[0] > 250 && pixelData[1] > 250 && pixelData[2] > 250;
            const isBlack = pixelData[0] < 5 && pixelData[1] < 5 && pixelData[2] < 5;

            if (isWhite || isBlack) {
                console.log('Возможно пустой canvas, пробуем другой...');

                // Пробуем все canvas по очереди
                for (const canvas of arCanvases) {
                    if (canvas !== largestCanvas) {
                        saveCanvasImage(canvas);
                        return;
                    }
                }
            }

            // 5. Сохраняем найденный canvas
            saveCanvasImage(largestCanvas);

        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка скриншота: ' + error.message);
        }
    }

    function saveCanvasImage(sourceCanvas) {
        try {
            // Создаем новый canvas
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = sourceCanvas.width;
            finalCanvas.height = sourceCanvas.height;
            const ctx = finalCanvas.getContext('2d');

            // Для отладки: заливаем красным если canvas маленький
            if (sourceCanvas.width < 200) {
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            }

            // Копируем исходный canvas
            ctx.drawImage(sourceCanvas, 0, 0);

            // Создаем Data URL
            const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);

            // Сохраняем
            const link = document.createElement('a');
            const timestamp = new Date().toISOString()
                .replace(/[:.]/g, '-')
                .slice(0, 19);

            link.download = `ar_screenshot_${timestamp}.jpg`;
            link.href = dataUrl;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Инструкция
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                alert('Скриншот создан! Нажмите "Поделиться" → "Сохранить в Фото"');
            } else {
                alert('Скриншот сохранен в загрузки!');
            }

            console.log('Скриншот сохранен, размер:',
                sourceCanvas.width, 'x', sourceCanvas.height);

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка при сохранении: ' + error.message);
        }
    }

    // Дополнительно: функция для ручной проверки всех canvas
    window.debugARCanvases = function () {
        const canvases = document.querySelectorAll('canvas');
        console.log('=== ДЕБАГ CANVAS ===');
        console.log('Всего canvas:', canvases.length);

        canvases.forEach((canvas, i) => {
            console.log(`Canvas ${i}: ${canvas.width}x${canvas.height}`);
            console.log('CSS:', canvas.style.cssText);
            console.log('Parent:', canvas.parentElement);
            console.log('---');
        });

        // Проверяем, есть ли видео элементы
        const videos = document.querySelectorAll('video');
        console.log('Видео элементы:', videos.length);

        if (videos.length > 0) {
            console.log('Видео размер:', videos[0].videoWidth, 'x', videos[0].videoHeight);
        }

        alert('Информация в консоли. Нажмите F12 (ПК) или откройте DevTools');
    };

    // Автоматически запускаем дебаг через 5 секунд
    setTimeout(() => {
        if (typeof window.debugARCanvases === 'function') {
            window.debugARCanvases();
        }
    }, 5000);
});