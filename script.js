// Основные переменные
let scene, model, camera;
let isModelPlaced = false;
let isRotating = false;
let isMoving = false;
let currentMode = 'none'; // 'rotate', 'move', 'none'

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function () {
    // Получаем элементы
    scene = document.querySelector('#arScene');
    model = document.querySelector('#model') || document.querySelector('#fallbackModel');

    // Настройка кнопок
    const placeBtn = document.getElementById('PlaceButton');
    const rotateBtn = document.getElementById('RotateButton');
    const moveBtn = document.getElementById('MoveButton');
    const shotBtn = document.getElementById('ShotButton');

    // 1. Инициализация AR сцены
    scene.addEventListener('loaded', function () {
        console.log('AR сцена загружена');
        showMessage('Наведите камеру на маркер Hiro или нажмите "Разместить"');

        // Проверяем, загрузилась ли модель
        setTimeout(checkModelLoad, 2000);
    });

    // 2. Проверка загрузки модели
    function checkModelLoad() {
        const modelEl = document.querySelector('[gltf-model]');
        if (modelEl && modelEl.components['gltf-model'] && modelEl.components['gltf-model'].model) {
            console.log('3D модель загружена');
        } else {
            console.warn('Модель не загрузилась. Проверьте путь:', model.getAttribute('gltf-model'));
            showMessage('Модель не загрузилась. Проверьте консоль браузера');
        }
    }

    // 3. Размещение модели
    placeBtn.addEventListener('click', function () {
        if (!isModelPlaced) {
            // Вариант A: Используем маркер
            const marker = document.querySelector('#marker');
            if (marker && marker.object3D.visible) {
                // Модель уже на маркере
                model.setAttribute('visible', 'true');
                showMessage('Модель размещена на маркере!');
            }
            // Вариант B: Размещаем перед камерой
            else {
                const fallbackModel = document.querySelector('#fallbackModel');
                if (fallbackModel) {
                    fallbackModel.setAttribute('visible', 'true');
                    fallbackModel.setAttribute('position', '0 0 -2');
                    model = fallbackModel;
                    showMessage('Модель размещена перед камерой');
                }
            }

            isModelPlaced = true;
            placeBtn.textContent = '✓ Размещено';
            placeBtn.style.background = '#00cc66';
        }
    });

    // 4. Режим вращения
    rotateBtn.addEventListener('click', function () {
        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!');
            return;
        }

        currentMode = currentMode === 'rotate' ? 'none' : 'rotate';
        isRotating = currentMode === 'rotate';
        isMoving = false;

        rotateBtn.style.background = isRotating ? '#ff5500' : '#ff9900';
        moveBtn.style.background = '#00cc66';

        showMessage(isRotating ? 'Режим вращения: двигайте палец по экрану' : 'Режим выключен');
    });

    // 5. Режим перемещения
    moveBtn.addEventListener('click', function () {
        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!');
            return;
        }

        currentMode = currentMode === 'move' ? 'none' : 'move';
        isMoving = currentMode === 'move';
        isRotating = false;

        moveBtn.style.background = isMoving ? '#009944' : '#00cc66';
        rotateBtn.style.background = '#ff9900';

        showMessage(isMoving ? 'Режим перемещения: двигайте палец по экрану' : 'Режим выключен');
    });

    // 6. Обработка касаний для управления
    let lastTouchX = 0;
    let lastTouchY = 0;

    scene.addEventListener('touchstart', function (e) {
        if (!isModelPlaced) return;

        const touch = e.touches[0];
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;

        e.preventDefault();
    });

    scene.addEventListener('touchmove', function (e) {
        if (!isModelPlaced || (!isRotating && !isMoving)) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchX;
        const deltaY = touch.clientY - lastTouchY;

        if (isRotating) {
            // Вращение модели
            const rotation = model.getAttribute('rotation');
            model.setAttribute('rotation', {
                x: rotation.x + deltaY * 0.5,
                y: rotation.y + deltaX * 0.5,
                z: rotation.z
            });
        }
        else if (isMoving) {
            // Перемещение модели
            const position = model.getAttribute('position');
            model.setAttribute('position', {
                x: position.x + deltaX * 0.01,
                y: position.y - deltaY * 0.01,
                z: position.z
            });
        }

        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;

        e.preventDefault();
    });

    // 7. Скриншот (РАБОЧИЙ метод)
    shotBtn.addEventListener('click', function () {
        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!');
            return;
        }

        showMessage('Создаем фото...');

        // Метод 1: Захват через html2canvas (надежнее)
        captureScreenshotHTML2Canvas();
    });

    function captureScreenshotHTML2Canvas() {
        // Находим ВСЕ элементы canvas на странице
        const canvases = document.querySelectorAll('canvas');

        if (canvases.length === 0) {
            showMessage('Не найден canvas для захвата');
            return;
        }

        // Берем самый большой canvas (скорее всего это AR сцена)
        let targetCanvas = null;
        let maxArea = 0;

        canvases.forEach(canvas => {
            const area = canvas.width * canvas.height;
            if (area > maxArea && canvas.width > 100 && canvas.height > 100) {
                maxArea = area;
                targetCanvas = canvas;
            }
        });

        if (!targetCanvas) {
            targetCanvas = canvases[0];
        }

        console.log('Используем canvas:', targetCanvas.width, 'x', targetCanvas.height);

        // Создаем новый canvas для обработки
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetCanvas.width;
        finalCanvas.height = targetCanvas.height;
        const ctx = finalCanvas.getContext('2d');

        // Заливаем черным фоном (так лучше видно 3D модель)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        // Копируем содержимое
        ctx.drawImage(targetCanvas, 0, 0);

        // Сохраняем
        saveCanvasImage(finalCanvas);
    }

    function saveCanvasImage(canvas) {
        // Конвертируем в Data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // Создаем временную ссылку
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `AR_НовыйГод_${timestamp}.jpg`;
        link.href = dataUrl;
        link.style.display = 'none';

        // Добавляем и кликаем
        document.body.appendChild(link);
        link.click();

        // Удаляем через секунду
        setTimeout(() => {
            document.body.removeChild(link);
            showInstructions();
        }, 1000);
    }

    function showInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        if (isIOS) {
            showMessage('Фото создано! Нажмите на миниатюру вверху экрана → "Поделиться" → "Сохранить в Фото"');
        } else if (isAndroid) {
            showMessage('Фото сохранено в "Загрузки"!');
        } else {
            showMessage('Скриншот сохранен в папку загрузок!');
        }
    }

    // 8. Вспомогательные функции
    function showMessage(text, duration = 3000) {
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = text;
        messageBox.style.display = 'block';

        setTimeout(() => {
            messageBox.style.display = 'none';
        }, duration);
    }

    // 9. Отладка - консоль информации
    console.log('=== AR Debug Info ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Is iOS:', /iPad|iPhone|iPod/.test(navigator.userAgent));
    console.log('Is Android:', /Android/.test(navigator.userAgent));

    // 10. Автоматическая проверка через 5 секунд
    setTimeout(() => {
        const video = document.querySelector('video');
        const canvases = document.querySelectorAll('canvas');

        console.log('Видео элементы:', video ? 'Да' : 'Нет');
        console.log('Canvas элементы:', canvases.length);

        if (video && video.videoWidth > 0) {
            console.log('Камера работает:', video.videoWidth, 'x', video.videoHeight);
            showMessage('Камера активирована!');
        } else {
            showMessage('Проблема с камерой. Разрешите доступ к камере.');
        }
    }, 5000);
});