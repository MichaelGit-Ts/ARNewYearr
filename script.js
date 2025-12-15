document.addEventListener('DOMContentLoaded', function () {
    const shotButton = document.getElementById('ShotButton');
    const sceneEl = document.querySelector('a-scene');

    if (!shotButton || !sceneEl) return;

    // 1. Ждем полной инициализации AR
    sceneEl.addEventListener('loaded', function () {
        console.log('AR сцена загружена');

        // Ждем еще 2 секунды для стабилизации AR.js
        setTimeout(() => {
            shotButton.disabled = false;
            shotButton.addEventListener('click', captureARWithGL);
        }, 2000);
    });

    // 2. Функция захвата через WebGL рендер сцены
    function captureARWithGL() {
        try {
            // Вариант A: Используем встроенный скриншот от A-Frame
            if (sceneEl.components && sceneEl.components.screenshot) {
                sceneEl.components.screenshot.capture('perspective')
                    .then(handleScreenshot)
                    .catch(() => captureARManual());
                return;
            }

            // Вариант B: Ручной захват
            captureARManual();

        } catch (error) {
            console.error('Ошибка:', error);
            captureARManual(); // Пробуем ручной метод
        }
    }

    // 3. Ручной метод захвата WebGL
    function captureARManual() {
        const renderer = sceneEl.renderer;
        if (!renderer) {
            alert('WebGL рендерер не инициализирован');
            return;
        }

        // Создаем canvas из WebGL контекста
        const gl = renderer.getContext();
        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;

        // Создаем canvas для результата
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Читаем пиксели из WebGL
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Создаем ImageData (переворачиваем Y координату)
        const imageData = ctx.createImageData(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIndex = (y * width + x) * 4;
                const dstIndex = ((height - y - 1) * width + x) * 4;

                imageData.data[dstIndex] = pixels[srcIndex];     // R
                imageData.data[dstIndex + 1] = pixels[srcIndex + 1]; // G
                imageData.data[dstIndex + 2] = pixels[srcIndex + 2]; // B
                imageData.data[dstIndex + 3] = pixels[srcIndex + 3]; // A
            }
        }

        // Рисуем на canvas
        ctx.putImageData(imageData, 0, 0);

        // Сохраняем
        saveCanvasImage(canvas);
    }

    // 4. Обработка скриншота от A-Frame
    function handleScreenshot(dataURI) {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, 19);

        link.download = `ar_screenshot_${timestamp}.png`;
        link.href = dataURI;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSaveInstructions();
    }

    // 5. Сохранение canvas
    function saveCanvasImage(canvas) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        const link = document.createElement('a');
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, 19);

        link.download = `ar_screenshot_${timestamp}.jpg`;
        link.href = dataUrl;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSaveInstructions();
    }

    // 6. Инструкции для пользователя
    function showSaveInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            setTimeout(() => {
                alert('📸 Скриншот готов!\n\nНа iOS:\n1. Нажмите "Поделиться" внизу экрана\n2. Прокрутите вправо\n3. Выберите "Сохранить в Фото"');
            }, 500);
        } else {
            setTimeout(() => {
                alert('✅ Скриншот сохранен в папку "Загрузки"!');
            }, 500);
        }
    }

    // 7. Инициализация скриншота при загрузке
    function initScreenshot() {
        console.log('Инициализация скриншота...');

        // Добавляем компонент screenshot если его нет
        if (!sceneEl.hasAttribute('screenshot')) {
            sceneEl.setAttribute('screenshot', {
                width: 1920,
                height: 1080
            });
        }
    }

    // Запускаем инициализацию
    setTimeout(initScreenshot, 1000);
});