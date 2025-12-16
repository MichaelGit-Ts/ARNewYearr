// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ФУНКЦИИ =====
let scene, model, camera;
let isModelPlaced = false;
let isRotating = false;
let isMoving = false;
let currentMode = 'none';
let lastTouchX = 0;
let lastTouchY = 0;
let pinchScaleComponentAdded = false;

// Глобальная функция для показа сообщений
function showMessage(text, duration = 3000) {
    console.log('📢 Сообщение:', text);

    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.textContent = text;
        messageBox.style.display = 'block';

        setTimeout(() => {
            if (messageBox && messageBox.parentNode) {
                messageBox.style.display = 'none';
            }
        }, duration);
    } else {
        // Создаем временное сообщение если messageBox не найден
        const tempMsg = document.createElement('div');
        tempMsg.textContent = text;
        tempMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            z-index: 10000;
            font-family: 'Pacifico', cursive;
            font-size: 18px;
            text-align: center;
            max-width: 80%;
            backdrop-filter: blur(5px);
        `;

        document.body.appendChild(tempMsg);
        setTimeout(() => {
            if (tempMsg.parentNode) {
                tempMsg.remove();
            }
        }, duration);
    }
}

// ===== ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 AR приложение запускается');

    // Получаем элементы
    scene = document.querySelector('#arScene');
    model = document.querySelector('#model') || document.querySelector('#fallbackModel');

    // Настройка кнопок
    const placeBtn = document.getElementById('PlaceButton');
    const rotateBtn = document.getElementById('RotateButton');
    const moveBtn = document.getElementById('MoveButton');
    const shotBtn = document.getElementById('ShotButton');
    const resetBtn = document.getElementById('ResetButton');

    // Проверяем, что все элементы найдены
    if (!placeBtn || !rotateBtn || !moveBtn || !shotBtn || !resetBtn) {
        console.error('❌ Не найдены некоторые кнопки управления');
        showMessage('Ошибка загрузки интерфейса', 5000);
    }

    // 1. Инициализация AR сцены
    scene.addEventListener('loaded', function () {
        console.log('✅ AR сцена загружена');
        showMessage('Наведите камеру на маркер Hiro или нажмите "Разместить"', 3000);

        // Проверяем загрузку модели
        setTimeout(checkModelLoad, 2000);

        // Показываем стартовое сообщение
        setTimeout(() => {
            showMessage('🎄 Новогодний AR готов к работе!', 2000);
        }, 1000);
    });

    // 2. Проверка загрузки модели
    function checkModelLoad() {
        const modelEl = document.querySelector('[gltf-model]');
        if (modelEl) {
            modelEl.addEventListener('model-loaded', function () {
                console.log('✅ 3D модель загружена');
            });

            // Проверка через 3 секунды
            setTimeout(() => {
                if (modelEl.hasLoaded) {
                    console.log('✅ Модель загружена и готова');
                } else {
                    console.warn('⚠️ Модель не загрузилась полностью');
                    showMessage('Модель загружается...', 2000);
                }
            }, 3000);
        } else {
            console.error('❌ Элемент модели не найден');
        }
    }

    // 3. РАЗМЕЩЕНИЕ МОДЕЛИ
    placeBtn.addEventListener('click', function () {
        console.log('🖱️ Кнопка "Разместить" нажата');

        if (!isModelPlaced) {
            let placementSuccessful = false;

            // Пробуем найти и использовать маркер
            const marker = document.querySelector('#marker');
            if (marker && marker.object3D && marker.object3D.visible) {
                model.setAttribute('visible', 'true');
                console.log('✅ Модель размещена на маркере');
                placementSuccessful = true;
            }
            // Размещаем перед камерой (fallback)
            else {
                const fallbackModel = document.querySelector('#fallbackModel');
                if (fallbackModel) {
                    fallbackModel.setAttribute('visible', 'true');
                    fallbackModel.setAttribute('position', '0 0 -2');
                    model = fallbackModel;
                    console.log('✅ Модель размещена перед камерой');
                    placementSuccessful = true;
                } else {
                    // Если fallbackModel не найден, используем основную модель
                    if (model) {
                        model.setAttribute('visible', 'true');
                        model.setAttribute('position', '0 0 -2');
                        console.log('✅ Модель размещена (основная)');
                        placementSuccessful = true;
                    }
                }
            }

            if (placementSuccessful) {
                isModelPlaced = true;
                placeBtn.textContent = '✓ Размещено';
                placeBtn.style.background = '#00cc66';

                // Активируем управление
                enableGestures();

                // Добавляем масштабирование
                setTimeout(() => addPinchZoomComponent(), 500);

                showMessage('Модель размещена! Используйте жесты для управления', 3000);
            } else {
                console.error('❌ Не удалось разместить модель');
                showMessage('Ошибка: не удалось разместить модель', 3000);
            }
        } else {
            showMessage('Модель уже размещена', 2000);
        }
    });

    // 4. РЕЖИМ ВРАЩЕНИЯ
    rotateBtn.addEventListener('click', function () {
        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!', 2000);
            return;
        }

        currentMode = currentMode === 'rotate' ? 'none' : 'rotate';
        isRotating = currentMode === 'rotate';
        isMoving = false;

        // Визуальная индикация
        rotateBtn.style.background = isRotating ? '#ff5500' : '#ff9900';
        moveBtn.style.background = '#00cc66';

        console.log(`Режим вращения: ${isRotating ? 'ВКЛ' : 'ВЫКЛ'}`);
        showMessage(isRotating ? 'Режим вращения активирован' : 'Режим выключен', 2000);
    });

    // 5. РЕЖИМ ПЕРЕМЕЩЕНИЯ
    moveBtn.addEventListener('click', function () {
        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!', 2000);
            return;
        }

        currentMode = currentMode === 'move' ? 'none' : 'move';
        isMoving = currentMode === 'move';
        isRotating = false;

        // Визуальная индикация
        moveBtn.style.background = isMoving ? '#009944' : '#00cc66';
        rotateBtn.style.background = '#ff9900';

        console.log(`Режим перемещения: ${isMoving ? 'ВКЛ' : 'ВЫКЛ'}`);
        showMessage(isMoving ? 'Режим перемещения активирован' : 'Режим выключен', 2000);
    });

    // 6. СБРОС МОДЕЛИ
    resetBtn.addEventListener('click', function () {
        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!', 2000);
            return;
        }

        // Сбрасываем позицию, вращение и масштаб
        model.setAttribute('position', '0 0 -2');
        model.setAttribute('rotation', '0 0 0');
        model.setAttribute('scale', '0.1 0.1 0.1');

        // Сбрасываем режимы
        currentMode = 'none';
        isRotating = false;
        isMoving = false;

        // Сбрасываем визуальную индикацию кнопок
        rotateBtn.style.background = '#ff9900';
        moveBtn.style.background = '#00cc66';

        console.log('✅ Модель сброшена');
        showMessage('Модель сброшена в исходное положение', 2000);

        // Анимация кнопки
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 200);
    });

    // 7. СНИМОК ЭКРАНА
    shotBtn.addEventListener('click', function () {
        if (!isModelPlaced) {
            showMessage('Сначала разместите модель!', 2000);
            return;
        }

        console.log('📸 Создаем фото...');
        showMessage('Создаем фото...', 1500);

        // Даем время для стабилизации кадра
        setTimeout(captureScreenshot, 300);
    });

    // 8. ВКЛЮЧЕНИЕ ЖЕСТОВ УПРАВЛЕНИЯ
    function enableGestures() {
        console.log('✅ Жесты управления активированы');

        // Удаляем старые обработчики если есть
        scene.removeEventListener('touchstart', handleTouchStart);
        scene.removeEventListener('touchmove', handleTouchMove);
        scene.removeEventListener('touchend', handleTouchEnd);

        // Добавляем новые обработчики
        scene.addEventListener('touchstart', handleTouchStart, { passive: false });
        scene.addEventListener('touchmove', handleTouchMove, { passive: false });
        scene.addEventListener('touchend', handleTouchEnd);
    }

    // 9. ОБРАБОТЧИКИ КАСАНИЙ
    function handleTouchStart(e) {
        if (!isModelPlaced || (!isRotating && !isMoving)) return;

        // Если один палец и активен режим
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            e.preventDefault();
        }
    }

    function handleTouchMove(e) {
        if (!isModelPlaced || (!isRotating && !isMoving)) return;

        // Если один палец
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;

            if (isRotating) {
                // Вращение модели
                const rotation = model.getAttribute('rotation');
                const newRotation = {
                    x: rotation.x + deltaY * 0.5,
                    y: rotation.y + deltaX * 0.5,
                    z: rotation.z
                };
                model.setAttribute('rotation', newRotation);
            }
            else if (isMoving) {
                // Перемещение модели
                const position = model.getAttribute('position');
                const newPosition = {
                    x: position.x + deltaX * 0.01,
                    y: position.y - deltaY * 0.01,
                    z: position.z
                };
                model.setAttribute('position', newPosition);
            }

            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        // Сбрасываем состояние при окончании касания
    }

    // 10. ФУНКЦИЯ СНИМКА ЭКРАНА
    function captureScreenshot() {
        try {
            // Ждем еще немного для рендера
            setTimeout(() => {
                // Ищем все canvas элементы
                const canvases = document.querySelectorAll('canvas');

                if (canvases.length === 0) {
                    showMessage('Ошибка: canvas не найден', 2000);
                    return;
                }

                // Выбираем canvas сцены A-Frame
                let targetCanvas = scene.canvas;
                if (!targetCanvas) {
                    // Ищем любой подходящий canvas
                    canvases.forEach(canvas => {
                        if (canvas.width > 300 && canvas.height > 300) {
                            targetCanvas = canvas;
                        }
                    });
                }

                if (!targetCanvas) {
                    targetCanvas = canvases[0];
                }

                console.log('📸 Захватываем canvas:', targetCanvas.width, 'x', targetCanvas.height);

                // Создаем финальный canvas
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = targetCanvas.width;
                finalCanvas.height = targetCanvas.height;
                const ctx = finalCanvas.getContext('2d');

                // Черный фон для AR
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

                // Копируем содержимое
                ctx.drawImage(targetCanvas, 0, 0);

                // Добавляем текст
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = 'bold 28px Pacifico';
                ctx.fillText('🎄 С Новым Годом!', 30, finalCanvas.height - 40);

                // Сохраняем изображение
                saveImage(finalCanvas);
            }, 100);

        } catch (error) {
            console.error('Ошибка создания скриншота:', error);
            showMessage('Ошибка: ' + error.message, 3000);
        }
    }

    function saveImage(canvas) {
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

            const link = document.createElement('a');
            const timestamp = new Date().toISOString()
                .replace(/[:.]/g, '-')
                .slice(0, 19);

            link.download = `AR_НовыйГод_${timestamp}.jpg`;
            link.href = dataUrl;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                if (link.parentNode) {
                    document.body.removeChild(link);
                }
                showSaveInstructions();
            }, 100);

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            showMessage('Ошибка сохранения файла', 3000);
        }
    }

    function showSaveInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (isIOS) {
            showMessage('📸 Фото создано! Нажмите на миниатюру вверху → "Поделиться" → "Сохранить в Фото"', 4000);
        } else {
            showMessage('📸 Фото сохранено в папку "Загрузки"!', 3000);
        }
    }

    // 11. ОТЛАДКА
    console.log('=== ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Модель найдена:', model ? 'Да' : 'Нет');
    console.log('Сцена найдена:', scene ? 'Да' : 'Нет');

    // Проверка камеры через 3 секунды
    setTimeout(() => {
        const video = document.querySelector('video');
        if (video && video.videoWidth > 0) {
            console.log('✅ Камера работает:', video.videoWidth, 'x', video.videoHeight);
        } else {
            console.warn('⚠️ Камера не работает или не доступна');
            showMessage('Разрешите доступ к камере для AR', 3000);
        }
    }, 3000);
});

// ===== КОМПОНЕНТ МАСШТАБИРОВАНИЯ ДВУМЯ ПАЛЬЦАМИ =====

function addPinchZoomComponent() {
    console.log('🔄 Добавляем компонент масштабирования...');

    // Проверяем, добавлен ли уже компонент
    if (pinchScaleComponentAdded) {
        console.log('✅ Компонент масштабирования уже добавлен');
        return;
    }

    // Ждем, пока A-Frame будет загружен
    if (typeof AFRAME === 'undefined') {
        console.warn('⚠️ A-Frame не загружен, ждем...');
        setTimeout(addPinchZoomComponent, 1000);
        return;
    }

    // Регистрируем компонент если еще не зарегистрирован
    if (!AFRAME.components['pinch-scale']) {
        AFRAME.registerComponent('pinch-scale', {
            schema: {
                min: { default: 0.05 },
                max: { default: 0.3 }
            },

            init: function () {
                console.log('✅ Компонент масштабирования инициализирован');

                this.initialDistance = null;
                this.initialScale = null;
                this.isScaling = false;

                // Привязываем обработчики
                this.handleTouchStart = this.handleTouchStart.bind(this);
                this.handleTouchMove = this.handleTouchMove.bind(this);
                this.handleTouchEnd = this.handleTouchEnd.bind(this);

                // Добавляем обработчики на сцену
                this.el.sceneEl.addEventListener('touchstart', this.handleTouchStart);
                this.el.sceneEl.addEventListener('touchmove', this.handleTouchMove, { passive: false });
                this.el.sceneEl.addEventListener('touchend', this.handleTouchEnd);
                this.el.sceneEl.addEventListener('touchcancel', this.handleTouchEnd);
            },

            handleTouchStart: function (event) {
                // Если касаются двумя пальцами - начинаем масштабирование
                if (event.touches.length === 2) {
                    this.isScaling = true;
                    this.initialDistance = this.getDistance(
                        event.touches[0],
                        event.touches[1]
                    );
                    this.initialScale = this.el.getAttribute('scale');
                    event.preventDefault();

                    console.log('✌️ Начало жеста масштабирования');

                    // Показываем подсказку один раз
                    if (!localStorage.getItem('pinchHintShown')) {
                        showMessage('✌️ Используйте два пальца для масштабирования', 2000);
                        localStorage.setItem('pinchHintShown', 'true');
                    }
                }
            },

            handleTouchMove: function (event) {
                if (!this.isScaling || event.touches.length !== 2) return;

                const currentDistance = this.getDistance(
                    event.touches[0],
                    event.touches[1]
                );

                if (this.initialDistance && this.initialScale) {
                    const scaleFactor = currentDistance / this.initialDistance;
                    this.applyScale(scaleFactor);
                }

                event.preventDefault();
            },

            handleTouchEnd: function () {
                this.isScaling = false;
                this.initialDistance = null;
                this.initialScale = null;
            },

            getDistance: function (touch1, touch2) {
                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                return Math.sqrt(dx * dx + dy * dy);
            },

            applyScale: function (scaleFactor) {
                // Ограничиваем масштаб
                const minScale = this.data.min;
                const maxScale = this.data.max;
                const clampedScale = Math.max(minScale, Math.min(maxScale, scaleFactor));

                const newScale = {
                    x: this.initialScale.x * clampedScale,
                    y: this.initialScale.y * clampedScale,
                    z: this.initialScale.z * clampedScale
                };

                this.el.setAttribute('scale', newScale);
                console.log('🔍 Масштаб изменен:', newScale);
            },

            remove: function () {
                // Очищаем обработчики
                this.el.sceneEl.removeEventListener('touchstart', this.handleTouchStart);
                this.el.sceneEl.removeEventListener('touchmove', this.handleTouchMove);
                this.el.sceneEl.removeEventListener('touchend', this.handleTouchEnd);
                this.el.sceneEl.removeEventListener('touchcancel', this.handleTouchEnd);
            }
        });
    }

    // Ждем, пока модель будет доступна
    const checkModel = setInterval(() => {
        const model = document.querySelector('#model') || document.querySelector('#fallbackModel');

        if (model && model.getAttribute('visible') === 'true') {
            clearInterval(checkModel);

            // Добавляем компонент к модели
            model.setAttribute('pinch-scale', {
                min: 0.05,
                max: 0.3
            });

            pinchScaleComponentAdded = true;
            console.log('✅ Компонент масштабирования успешно добавлен к модели');
        }
    }, 500);

    // Останавливаем проверку через 10 секунд
    setTimeout(() => {
        const checkModelInterval = window.checkModelInterval;
        if (checkModelInterval) clearInterval(checkModelInterval);
    }, 10000);
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ОТЛАДКИ =====

window.debugApp = function () {
    console.log('=== ОТЛАДКА ПРИЛОЖЕНИЯ ===');
    console.log('isModelPlaced:', window.isModelPlaced);
    console.log('currentMode:', window.currentMode);
    console.log('isRotating:', window.isRotating);
    console.log('isMoving:', window.isMoving);

    const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
    console.log('Модель:', model);
    console.log('Видимость:', model ? model.getAttribute('visible') : 'N/A');
    console.log('Позиция:', model ? model.getAttribute('position') : 'N/A');
    console.log('Масштаб:', model ? model.getAttribute('scale') : 'N/A');
    console.log('Компонент масштабирования:', model ? model.components['pinch-scale'] : 'N/A');

    // Проверка canvas элементов
    const canvases = document.querySelectorAll('canvas');
    console.log('Canvas элементы:', canvases.length);
    canvases.forEach((canvas, i) => {
        console.log(`Canvas ${i}: ${canvas.width}x${canvas.height}`);
    });
};

window.forcePlaceModel = function () {
    const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
    if (model) {
        model.setAttribute('visible', 'true');
        model.setAttribute('position', '0 0 -2');
        window.isModelPlaced = true;

        // Обновляем кнопку
        const placeBtn = document.getElementById('PlaceButton');
        if (placeBtn) {
            placeBtn.textContent = '✓ Размещено';
            placeBtn.style.background = '#00cc66';
        }

        // Включаем жесты
        const scene = document.querySelector('#arScene');
        if (scene) {
            console.log('✅ Принудительное размещение модели');
            showMessage('Модель размещена (принудительно)', 2000);

            // Добавляем масштабирование
            setTimeout(() => addPinchZoomComponent(), 500);
        }
    }
};

// Удалите подключение html2canvas из HTML если оно не нужно
// <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>