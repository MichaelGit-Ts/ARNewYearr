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
// ===== КОМПОНЕНТ ДЛЯ МАСШТАБИРОВАНИЯ ДВУМЯ ПАЛЬЦАМИ =====

// 1. Регистрируем компонент для жеста pinch-to-zoom
AFRAME.registerComponent('pinch-scale', {
    schema: {
        min: { type: 'number', default: 0.05 },
        max: { type: 'number', default: 0.5 },
        sensitivity: { type: 'number', default: 0.001 }
    },

    init: function () {
        this.initialDistance = null;
        this.initialScale = this.el.getAttribute('scale') || { x: 0.1, y: 0.1, z: 0.1 };

        // Слушаем события касания
        this.el.sceneEl.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.el.sceneEl.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.el.sceneEl.addEventListener('touchend', this.onTouchEnd.bind(this));

        console.log('Компонент pinch-scale инициализирован');
    },

    onTouchStart: function (event) {
        // Если касаний два - начинаем жести масштабирования
        if (event.touches.length === 2) {
            // Проверяем, касаются ли оба пальца нашей модели или рядом с ней
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            this.initialDistance = this.getDistance(touch1, touch2);
            this.initialScale = this.el.getAttribute('scale');

            // Показываем подсказку
            this.showPinchHint();

            event.preventDefault();
            return true;
        }
        return false;
    },

    onTouchMove: function (event) {
        // Обрабатываем жест масштабирования только если два пальца
        if (event.touches.length === 2 && this.initialDistance !== null) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = this.getDistance(touch1, touch2);

            // Вычисляем коэффициент масштабирования
            const scaleFactor = currentDistance / this.initialDistance;

            // Получаем текущий масштаб
            const currentScale = this.initialScale || { x: 0.1, y: 0.1, z: 0.1 };
            const newScale = {
                x: currentScale.x * scaleFactor,
                y: currentScale.y * scaleFactor,
                z: currentScale.z * scaleFactor
            };

            // Ограничиваем масштаб
            newScale.x = Math.max(this.data.min, Math.min(this.data.max, newScale.x));
            newScale.y = Math.max(this.data.min, Math.min(this.data.max, newScale.y));
            newScale.z = Math.max(this.data.min, Math.min(this.data.max, newScale.z));

            // Применяем новый масштаб
            this.el.setAttribute('scale', newScale);

            event.preventDefault();
            return true;
        }
        return false;
    },

    onTouchEnd: function (event) {
        // Сбрасываем состояние при окончании жеста
        if (event.touches.length < 2) {
            this.initialDistance = null;
            this.initialScale = null;
        }
    },

    getDistance: function (touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    },

    showPinchHint: function () {
        // Кратковременная подсказка о жесте масштабирования
        const hint = document.createElement('div');
        hint.innerHTML = '✌️ Используйте два пальца для масштабирования';
        hint.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 15px;
            z-index: 10001;
            font-family: 'Pacifico', cursive;
            font-size: 18px;
            text-align: center;
            animation: fadeInOut 3s ease;
        `;

        // Добавляем CSS анимацию
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(hint);
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
            if (style.parentNode) {
                style.remove();
            }
        }, 3000);
    }
});

// 2. Функция для добавления компонента к модели
function addPinchZoomToModel() {
    const model = document.querySelector('#model') || document.querySelector('#fallbackModel');

    if (model) {
        // Добавляем компонент pinch-scale к модели
        model.setAttribute('pinch-scale', {
            min: 0.03,   // Минимальный масштаб (30% от исходного)
            max: 0.3,    // Максимальный масштаб (300% от исходного)
            sensitivity: 0.0005
        });

        console.log('Добавлен компонент pinch-scale к модели');

        // Показываем инструкцию один раз
        if (!localStorage.getItem('pinchHintShown')) {
            setTimeout(() => {
                showMessage('✌️ Новый жест: двумя пальцами масштабируйте модель', 4000);
                localStorage.setItem('pinchHintShown', 'true');
            }, 2000);
        }

        return true;
    }

    return false;
}

// 3. Обновляем обработчики касаний для работы с масштабированием
function updateTouchHandlersForPinch() {
    const scene = document.querySelector('#arScene');

    if (!scene) return;

    // Перехватываем события касаний для обработки жеста масштабирования
    scene.addEventListener('touchstart', function (e) {
        // Если два пальца - не передаем событие дальше
        if (e.touches.length === 2) {
            // Жест масштабирования обрабатывается компонентом pinch-scale
            return;
        }
    }, { passive: false });

    scene.addEventListener('touchmove', function (e) {
        // Если два пальца - предотвращаем прокрутку страницы
        if (e.touches.length === 2) {
            e.preventDefault();
            return;
        }
    }, { passive: false });
}

// 4. Добавляем кнопку сброса масштаба (опционально)
function addScaleResetButton() {
    const controls = document.querySelector('.controls');

    if (!controls) return;

    // Создаем кнопку сброса масштаба
    const resetScaleBtn = document.createElement('button');
    resetScaleBtn.id = 'ResetScaleButton';
    resetScaleBtn.innerHTML = '🔍 Сброс масштаба';
    resetScaleBtn.title = 'Вернуть модель к исходному размеру';

    // Добавляем стили
    resetScaleBtn.style.cssText = `
        background: #9c27b0;
        color: #fff;
        padding: clamp(10px, 2.5vh, 14px) clamp(15px, 3vw, 20px);
        border: 0;
        border-radius: 50px;
        font-family: 'Pacifico', cursive;
        font-size: clamp(12px, 3vw, 16px);
        cursor: pointer;
        min-width: max-content;
        flex: 1;
        max-width: 22vw;
        white-space: nowrap;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;

    // Обработчик клика
    resetScaleBtn.addEventListener('click', function () {
        const model = document.querySelector('#model') || document.querySelector('#fallbackModel');

        if (model) {
            // Сбрасываем масштаб к исходному
            model.setAttribute('scale', '0.1 0.1 0.1');
            showMessage('Масштаб сброшен к исходному размеру');

            // Анимация кнопки
            this.style.animation = 'buttonPulse 0.3s ease';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        }
    });

    // Вставляем кнопку перед кнопкой фото
    const shotBtn = document.getElementById('ShotButton');
    if (shotBtn && shotBtn.parentNode) {
        controls.insertBefore(resetScaleBtn, shotBtn);
    } else {
        controls.appendChild(resetScaleBtn);
    }
}

// 5. Инициализация функции масштабирования
function initPinchZoom() {
    // Ждем загрузки модели
    setTimeout(() => {
        // Добавляем компонент pinch-scale к модели
        const added = addPinchZoomToModel();

        if (added) {
            // Обновляем обработчики касаний
            updateTouchHandlersForPinch();

            // Добавляем кнопку сброса масштаба (опционально)
            addScaleResetButton();

            console.log('Функция масштабирования двумя пальцами активирована');
        } else {
            console.warn('Не удалось найти модель для добавления жеста масштабирования');

            // Пробуем еще раз через 2 секунды
            setTimeout(initPinchZoom, 2000);
        }
    }, 3000); // Ждем 3 секунды для полной загрузки сцены
}

// 6. Обновляем инструкции
function updateInstructionsForPinch() {
    // Обновляем текст в существующих сообщениях
    const originalShowMessage = window.showMessage;

    if (typeof originalShowMessage === 'function') {
        window.showMessage = function (text, duration) {
            // Добавляем подсказку про жест масштабирования в некоторые сообщения
            if (text.includes('Режим вращения') || text.includes('Режим перемещения')) {
                text += '\n✌️ Двумя пальцами - масштабирование';
            }
            return originalShowMessage.call(this, text, duration);
        };
    }

    // Добавляем подсказку в начало приложения
    setTimeout(() => {
        showMessage('Управление модели:\n• 1 палец - вращение/перемещение\n• 2 пальца - масштабирование', 5000);
    }, 5000);
}

// 7. Запускаем инициализацию при загрузке
document.addEventListener('DOMContentLoaded', function () {
    // Ждем полной загрузки A-Frame
    if (typeof AFRAME !== 'undefined') {
        // Инициализируем функцию масштабирования
        setTimeout(initPinchZoom, 1000);

        // Обновляем инструкции
        setTimeout(updateInstructionsForPinch, 2000);
    } else {
        // Если A-Frame еще не загружен, ждем
        const checkAFrame = setInterval(() => {
            if (typeof AFRAME !== 'undefined') {
                clearInterval(checkAFrame);
                initPinchZoom();
                updateInstructionsForPinch();
            }
        }, 500);
    }
});

// 8. Добавляем глобальную функцию для отладки
window.debugPinchZoom = function () {
    const model = document.querySelector('#model') || document.querySelector('#fallbackModel');

    if (model) {
        const scale = model.getAttribute('scale');
        console.log('Текущий масштаб модели:', scale);
        console.log('Компонент pinch-scale:', model.components['pinch-scale']);

        // Тестовое изменение масштаба
        model.setAttribute('scale', {
            x: scale.x * 1.2,
            y: scale.y * 1.2,
            z: scale.z * 1.2
        });

        showMessage('Тест масштабирования: +20%');
    }
};