// ===== ВОССТАНОВЛЕННЫЙ КОД СО ВСЕЙ ФУНКЦИОНАЛЬНОСТЬЮ =====

// Основные переменные
let scene, model, camera;
let isModelPlaced = false;
let isRotating = false;
let isMoving = false;
let currentMode = 'none'; // 'rotate', 'move', 'none'
let lastTouchX = 0;
let lastTouchY = 0;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function () {
    console.log('=== AR ПРИЛОЖЕНИЕ ЗАГРУЖАЕТСЯ ===');

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
        console.log('✅ AR сцена загружена');
        showMessage('Наведите камеру на маркер Hiro или нажмите "Разместить"');

        // Проверяем, загрузилась ли модель
        setTimeout(checkModelLoad, 2000);

        // Запускаем масштабирование после загрузки
        setTimeout(initPinchZoom, 3000);
    });

    // 2. Проверка загрузки модели
    function checkModelLoad() {
        const modelEl = document.querySelector('[gltf-model]');
        if (modelEl && modelEl.components['gltf-model'] && modelEl.components['gltf-model'].model) {
            console.log('✅ 3D модель загружена');
        } else {
            console.warn('⚠️ Модель не загрузилась. Проверьте путь:', model.getAttribute('gltf-model'));
            showMessage('Модель не загрузилась. Проверьте консоль браузера');
        }
    }

    // 3. Размещение модели (РАБОЧАЯ ФУНКЦИЯ)
    placeBtn.addEventListener('click', function () {
        console.log('🖱️ Нажата кнопка "Разместить"');

        if (!isModelPlaced) {
            // Вариант A: Используем маркер
            const marker = document.querySelector('#marker');
            if (marker && marker.object3D.visible) {
                // Модель уже на маркере
                model.setAttribute('visible', 'true');
                console.log('✅ Модель размещена на маркере');
                showMessage('Модель размещена на маркере!');
            }
            // Вариант B: Размещаем перед камерой
            else {
                const fallbackModel = document.querySelector('#fallbackModel');
                if (fallbackModel) {
                    fallbackModel.setAttribute('visible', 'true');
                    fallbackModel.setAttribute('position', '0 0 -2');
                    model = fallbackModel;
                    console.log('✅ Модель размещена перед камерой');
                    showMessage('Модель размещена перед камерой');
                } else {
                    console.error('❌ Не удалось найти модель для размещения');
                    showMessage('Ошибка: модель не найдена');
                    return;
                }
            }

            isModelPlaced = true;
            placeBtn.textContent = '✓ Размещено';
            placeBtn.style.background = '#00cc66';

            // Включаем жесты после размещения
            enableGestures();

        } else {
            console.log('Модель уже размещена');
            showMessage('Модель уже размещена');
        }
    });

    // 4. Режим вращения (РАБОЧАЯ ФУНКЦИЯ)
    rotateBtn.addEventListener('click', function () {
        console.log('🖱️ Нажата кнопка "Вращать"');

        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!');
            return;
        }

        currentMode = currentMode === 'rotate' ? 'none' : 'rotate';
        isRotating = currentMode === 'rotate';
        isMoving = false;

        rotateBtn.style.background = isRotating ? '#ff5500' : '#ff9900';
        moveBtn.style.background = '#00cc66';

        console.log(`Режим вращения: ${isRotating ? 'ВКЛ' : 'ВЫКЛ'}`);
        showMessage(isRotating ? 'Режим вращения: двигайте палец по экрану' : 'Режим выключен');
    });

    // 5. Режим перемещения (РАБОЧАЯ ФУНКЦИЯ)
    moveBtn.addEventListener('click', function () {
        console.log('🖱️ Нажата кнопка "Перемещать"');

        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!');
            return;
        }

        currentMode = currentMode === 'move' ? 'none' : 'move';
        isMoving = currentMode === 'move';
        isRotating = false;

        moveBtn.style.background = isMoving ? '#009944' : '#00cc66';
        rotateBtn.style.background = '#ff9900';

        console.log(`Режим перемещения: ${isMoving ? 'ВКЛ' : 'ВЫКЛ'}`);
        showMessage(isMoving ? 'Режим перемещения: двигайте палец по экрану' : 'Режим выключен');
    });

    // 6. Включение жестов после размещения модели
    function enableGestures() {
        console.log('✅ Жесты управления включены');

        // Обработка касаний для вращения и перемещения
        scene.addEventListener('touchstart', handleTouchStart);
        scene.addEventListener('touchmove', handleTouchMove);
        scene.addEventListener('touchend', handleTouchEnd);

        // Также для мыши (для тестирования на ПК)
        scene.addEventListener('mousedown', handleMouseDown);
        scene.addEventListener('mousemove', handleMouseMove);
        scene.addEventListener('mouseup', handleMouseUp);
    }

    // 7. Обработчики жестов
    function handleTouchStart(e) {
        if (!isModelPlaced || (!isRotating && !isMoving)) return;

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            e.preventDefault();
        }
    }

    function handleTouchMove(e) {
        if (!isModelPlaced || (!isRotating && !isMoving)) return;

        // Если один палец - обрабатываем вращение/перемещение
        if (e.touches.length === 1) {
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
        }
    }

    function handleTouchEnd(e) {
        // Сброс состояния
        if (e.touches.length === 0) {
            // Можно добавить сброс состояния
        }
    }

    // Обработчики мыши для тестирования на ПК
    function handleMouseDown(e) {
        if (!isModelPlaced || (!isRotating && !isMoving)) return;

        lastTouchX = e.clientX;
        lastTouchY = e.clientY;
        e.preventDefault();
    }

    function handleMouseMove(e) {
        if (!isModelPlaced || (!isRotating && !isMoving)) return;

        const deltaX = e.clientX - lastTouchX;
        const deltaY = e.clientY - lastTouchY;

        if (isRotating) {
            const rotation = model.getAttribute('rotation');
            model.setAttribute('rotation', {
                x: rotation.x + deltaY * 0.5,
                y: rotation.y + deltaX * 0.5,
                z: rotation.z
            });
        }
        else if (isMoving) {
            const position = model.getAttribute('position');
            model.setAttribute('position', {
                x: position.x + deltaX * 0.01,
                y: position.y - deltaY * 0.01,
                z: position.z
            });
        }

        lastTouchX = e.clientX;
        lastTouchY = e.clientY;
        e.preventDefault();
    }

    function handleMouseUp(e) {
        // Сброс состояния
    }

    // 8. Скриншот (РАБОЧАЯ ФУНКЦИЯ)
    shotBtn.addEventListener('click', function () {
        console.log('🖱️ Нажата кнопка "Сделать фото"');

        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!');
            return;
        }

        console.log('Создаем фото...');
        showMessage('Создаем фото...');

        // Используем html2canvas для скриншота
        captureScreenshotHTML2Canvas();
    });

    function captureScreenshotHTML2Canvas() {
        // Ждем немного для стабилизации
        setTimeout(() => {
            try {
                // Находим ВСЕ элементы canvas на странице
                const canvases = document.querySelectorAll('canvas');

                if (canvases.length === 0) {
                    showMessage('Не найден canvas для захвата');
                    return;
                }

                // Берем самый большой canvas
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

                // Создаем финальный canvas
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = targetCanvas.width;
                finalCanvas.height = targetCanvas.height;
                const ctx = finalCanvas.getContext('2d');

                // Заливаем фон
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

                // Копируем содержимое
                ctx.drawImage(targetCanvas, 0, 0);

                // Добавляем водяной знак
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = '24px Pacifico';
                ctx.fillText('🎄 С Новым Годом!', 20, finalCanvas.height - 30);

                // Сохраняем
                saveCanvasImage(finalCanvas);

            } catch (error) {
                console.error('Ошибка при создании скриншота:', error);
                showMessage('Ошибка при создании скриншота');
            }
        }, 500);
    }

    function saveCanvasImage(canvas) {
        try {
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
                showSaveInstructions();
            }, 1000);

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            showMessage('Ошибка сохранения файла');
        }
    }

    function showSaveInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        if (isIOS) {
            showMessage('📱 iOS: Фото создано! Нажмите на миниатюру вверху → "Поделиться" → "Сохранить в Фото"');
        } else if (isAndroid) {
            showMessage('📱 Android: Фото сохранено в "Загрузки"!');
        } else {
            showMessage('💻 Скриншот сохранен в папку загрузок!');
        }
    }

    // 9. Вспомогательные функции
    function showMessage(text, duration = 3000) {
        const messageBox = document.getElementById('messageBox');
        if (messageBox) {
            messageBox.textContent = text;
            messageBox.style.display = 'block';

            setTimeout(() => {
                messageBox.style.display = 'none';
            }, duration);
        } else {
            console.log('Сообщение:', text);
            alert(text);
        }
    }

    // 10. Отладка - консоль информации
    console.log('=== AR Debug Info ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Is iOS:', /iPad|iPhone|iPod/.test(navigator.userAgent));
    console.log('Is Android:', /Android/.test(navigator.userAgent));
    console.log('Модель найдена:', model ? 'Да' : 'Нет');

    // Автоматическая проверка через 3 секунды
    setTimeout(() => {
        const video = document.querySelector('video');
        const canvases = document.querySelectorAll('canvas');

        console.log('Видео элементы:', video ? 'Да' : 'Нет');
        console.log('Canvas элементы:', canvases.length);

        if (video && video.videoWidth > 0) {
            console.log('Камера работает:', video.videoWidth, 'x', video.videoHeight);
        }
    }, 3000);
});

// ===== КОМПОНЕНТ МАСШТАБИРОВАНИЯ (БЕЗ МЕШАЮЩИХ ПОДСКАЗОК) =====

function initPinchZoom() {
    console.log('🔄 Инициализация жеста масштабирования...');

    // Создаем простой компонент для масштабирования
    if (typeof AFRAME !== 'undefined') {
        AFRAME.registerComponent('pinch-scale-simple', {
            schema: {
                min: { default: 0.03 },
                max: { default: 0.3 }
            },

            init: function () {
                this.initialDistance = null;
                this.initialScale = null;
                this.sceneEl = this.el.sceneEl;

                // Привязываем обработчики
                this.onTouchStart = this.onTouchStart.bind(this);
                this.onTouchMove = this.onTouchMove.bind(this);
                this.onTouchEnd = this.onTouchEnd.bind(this);

                // Добавляем обработчики
                this.sceneEl.addEventListener('touchstart', this.onTouchStart);
                this.sceneEl.addEventListener('touchmove', this.onTouchMove, { passive: false });
                this.sceneEl.addEventListener('touchend', this.onTouchEnd);
                this.sceneEl.addEventListener('touchcancel', this.onTouchEnd);

                console.log('✅ Компонент масштабирования инициализирован');
            },

            onTouchStart: function (event) {
                // Обрабатываем только если модель размещена и два пальца
                if (event.touches.length === 2 && this.el.getAttribute('visible') === true) {
                    this.initialDistance = this.getDistance(
                        event.touches[0],
                        event.touches[1]
                    );
                    this.initialScale = this.el.getAttribute('scale');
                    event.preventDefault();
                }
            },

            onTouchMove: function (event) {
                // Обрабатываем только жест масштабирования
                if (event.touches.length === 2 && this.initialDistance !== null) {
                    const currentDistance = this.getDistance(
                        event.touches[0],
                        event.touches[1]
                    );

                    if (this.initialDistance > 0) {
                        const scaleFactor = currentDistance / this.initialDistance;
                        this.applyScale(scaleFactor);
                    }

                    event.preventDefault();
                }
            },

            onTouchEnd: function () {
                this.initialDistance = null;
                this.initialScale = null;
            },

            getDistance: function (touch1, touch2) {
                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                return Math.sqrt(dx * dx + dy * dy);
            },

            applyScale: function (scaleFactor) {
                const minScale = this.data.min;
                const maxScale = this.data.max;

                // Ограничиваем масштаб
                const clampedScale = Math.max(minScale, Math.min(maxScale, scaleFactor));

                // Применяем новый масштаб
                const newScale = {
                    x: this.initialScale.x * clampedScale,
                    y: this.initialScale.y * clampedScale,
                    z: this.initialScale.z * clampedScale
                };

                this.el.setAttribute('scale', newScale);
            },

            remove: function () {
                // Очистка обработчиков
                this.sceneEl.removeEventListener('touchstart', this.onTouchStart);
                this.sceneEl.removeEventListener('touchmove', this.onTouchMove);
                this.sceneEl.removeEventListener('touchend', this.onTouchEnd);
                this.sceneEl.removeEventListener('touchcancel', this.onTouchEnd);
            }
        });

        // Добавляем компонент к модели
        setTimeout(() => {
            const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
            if (model) {
                model.setAttribute('pinch-scale-simple', {
                    min: 0.03,
                    max: 0.3
                });
                console.log('✅ Жест масштабирования добавлен к модели');

                // Показываем подсказку один раз
                if (!localStorage.getItem('pinchHintShown')) {
                    setTimeout(() => {
                        showMessage('✌️ Новый жест: двумя пальцами масштабируйте модель', 4000);
                        localStorage.setItem('pinchHintShown', 'true');
                    }, 5000);
                }
            }
        }, 2000);
    }
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ОТЛАДКИ =====

window.debugAR = function () {
    console.log('=== DEBUG AR ===');
    console.log('isModelPlaced:', isModelPlaced);
    console.log('isRotating:', isRotating);
    console.log('isMoving:', isMoving);
    console.log('currentMode:', currentMode);

    const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
    console.log('Модель:', model);
    console.log('Видимость модели:', model ? model.getAttribute('visible') : 'Нет модели');
    console.log('Позиция модели:', model ? model.getAttribute('position') : 'Нет модели');

    const marker = document.querySelector('#marker');
    console.log('Маркер:', marker);
    console.log('Видимость маркера:', marker ? marker.getAttribute('visible') : 'Нет маркера');

    // Пробуем разместить модель программно
    if (!isModelPlaced && model) {
        model.setAttribute('visible', 'true');
        model.setAttribute('position', '0 0 -2');
        isModelPlaced = true;
        console.log('✅ Модель размещена программно');
        showMessage('Модель размещена (отладка)');
    }
};

window.resetAR = function () {
    const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
    if (model) {
        model.setAttribute('position', '0 0 -2');
        model.setAttribute('rotation', '0 0 0');
        model.setAttribute('scale', '0.1 0.1 0.1');
        console.log('✅ AR сцена сброшена');
        showMessage('AR сцена сброшена');
    }
};

// ===== СТАРТ ПРИЛОЖЕНИЯ =====

// Запускаем через 1 секунду после загрузки
setTimeout(() => {
    console.log('🚀 AR приложение запущено');
    showMessage('AR приложение готово!', 2000);
}, 1000);