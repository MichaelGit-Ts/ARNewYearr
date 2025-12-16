// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ФУНКЦИИ =====
let scene, mainModel, markerModel, camera;
let isModelPlaced = false;
let isRotating = false;
let isMoving = false;
let currentMode = 'none';
let lastTouchX = 0;
let lastTouchY = 0;
let pinchScaleComponentAdded = false;
let activeModel = null; // Текущая активная модель

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
    mainModel = document.querySelector('#mainModel');
    markerModel = document.querySelector('#markerModel');
    activeModel = mainModel; // По умолчанию используем основную модель

    // Настройка кнопок
    const placeBtn = document.getElementById('PlaceButton');
    const rotateBtn = document.getElementById('RotateButton');
    const moveBtn = document.getElementById('MoveButton');
    const shotBtn = document.getElementById('ShotButton');
    const resetBtn = document.getElementById('ResetButton');

    // Проверяем, что все элементы найдены
    if (!mainModel) {
        console.error('❌ Основная модель не найдена!');
        showMessage('Ошибка: модель не найдена', 5000);
    }

    // 1. ОБРАБОТКА ЗАГРУЗКИ МОДЕЛИ
    mainModel.addEventListener('model-loaded', function () {
        console.log('✅ 3D модель загружена');
        showMessage('3D модель готова к размещению', 2000);
    });

    mainModel.addEventListener('model-error', function (e) {
        console.error('❌ Ошибка загрузки модели:', e.detail);
        showMessage('Ошибка загрузки 3D модели. Проверьте путь к файлу.', 5000);
    });

    // 2. ИНИЦИАЛИЗАЦИЯ AR СЦЕНЫ
    scene.addEventListener('loaded', function () {
        console.log('✅ AR сцена загружена');
        showMessage('AR сцена загружена. Нажмите "Разместить"', 3000);

        // Проверяем, загрузилась ли модель
        setTimeout(checkModelStatus, 1000);

        // Настраиваем отслеживание маркера
        setupMarkerTracking();
    });

    function checkModelStatus() {
        console.log('🔍 Проверка статуса модели:');
        console.log('- Основная модель:', mainModel ? 'Найдена' : 'Не найдена');
        console.log('- Видимость:', mainModel ? mainModel.getAttribute('visible') : 'N/A');

        // Проверяем компонент gltf-model
        if (mainModel && mainModel.components && mainModel.components['gltf-model']) {
            const gltfComponent = mainModel.components['gltf-model'];
            console.log('- GLTF компонент:', gltfComponent);
            console.log('- Модель загружена:', gltfComponent.model ? 'Да' : 'Нет');
        }

        // Проверяем путь к модели
        const modelSrc = mainModel ? mainModel.getAttribute('gltf-model') : 'N/A';
        console.log('- Путь к модели:', modelSrc);
    }

    function setupMarkerTracking() {
        const marker = document.querySelector('#marker');
        if (marker) {
            marker.addEventListener('markerFound', function () {
                console.log('🎯 Маркер обнаружен');
                if (isModelPlaced) {
                    // Если модель уже размещена, скрываем основную и показываем маркерную
                    mainModel.setAttribute('visible', 'false');
                    markerModel.setAttribute('visible', 'true');
                    activeModel = markerModel;
                    showMessage('Модель переключена на маркер', 2000);
                }
            });

            marker.addEventListener('markerLost', function () {
                console.log('🎯 Маркер потерян');
                if (isModelPlaced && mainModel.getAttribute('visible') === 'false') {
                    // Возвращаемся к основной модели
                    markerModel.setAttribute('visible', 'false');
                    mainModel.setAttribute('visible', 'true');
                    activeModel = mainModel;
                }
            });
        }
    }

    // 3. РАЗМЕЩЕНИЕ МОДЕЛИ (ИСПРАВЛЕННАЯ ФУНКЦИЯ)
    placeBtn.addEventListener('click', function () {
        console.log('🖱️ Кнопка "Разместить" нажата');

        if (!isModelPlaced) {
            // Вариант 1: Если маркер виден, используем его
            const marker = document.querySelector('#marker');
            if (marker && marker.getAttribute('visible') === 'true') {
                console.log('✅ Размещаем модель на маркере');
                markerModel.setAttribute('visible', 'true');
                mainModel.setAttribute('visible', 'false');
                activeModel = markerModel;
                isModelPlaced = true;
            }
            // Вариант 2: Размещаем перед камерой
            else {
                console.log('✅ Размещаем модель перед камерой');
                mainModel.setAttribute('visible', 'true');
                mainModel.setAttribute('position', '0 0 -2');
                if (markerModel) markerModel.setAttribute('visible', 'false');
                activeModel = mainModel;
                isModelPlaced = true;
            }

            if (isModelPlaced) {
                placeBtn.textContent = '✓ Размещено';
                placeBtn.style.background = '#00cc66';

                // Активируем управление
                enableGestures();

                // Добавляем масштабирование
                setTimeout(() => addPinchZoomComponent(), 500);

                // Показываем подсказки по управлению
                showMessage('Модель размещена! Используйте жесты для управления', 3000);
                setTimeout(() => {
                    showMessage('Управление:\n• 1 палец - вращение/перемещение\n• 2 пальца - масштабирование', 4000);
                }, 3500);

                // Логируем статус
                console.log('📍 Модель размещена. Активная модель:', activeModel);
                console.log('- Позиция:', activeModel.getAttribute('position'));
                console.log('- Видимость:', activeModel.getAttribute('visible'));
            }
        } else {
            console.log('ℹ️ Модель уже размещена');
            showMessage('Модель уже размещена', 2000);
        }
    });

    // 4. РЕЖИМ ВРАЩЕНИЯ
    rotateBtn.addEventListener('click', function () {
        if (!isModelPlaced || !activeModel) {
            showMessage('Сначала разместите модель!', 2000);
            return;
        }

        currentMode = currentMode === 'rotate' ? 'none' : 'rotate';
        isRotating = currentMode === 'rotate';
        isMoving = false;

        rotateBtn.style.background = isRotating ? '#ff5500' : '#ff9900';
        moveBtn.style.background = '#00cc66';

        console.log(`🔄 Режим вращения: ${isRotating ? 'ВКЛ' : 'ВЫКЛ'}`);
        showMessage(isRotating ? 'Режим вращения: двигайте палец по экрану' : 'Режим выключен', 2000);
    });

    // 5. РЕЖИМ ПЕРЕМЕЩЕНИЯ
    moveBtn.addEventListener('click', function () {
        if (!isModelPlaced || !activeModel) {
            showMessage('Сначала разместите модель!', 2000);
            return;
        }

        currentMode = currentMode === 'move' ? 'none' : 'move';
        isMoving = currentMode === 'move';
        isRotating = false;

        moveBtn.style.background = isMoving ? '#009944' : '#00cc66';
        rotateBtn.style.background = '#ff9900';

        console.log(`↕️ Режим перемещения: ${isMoving ? 'ВКЛ' : 'ВЫКЛ'}`);
        showMessage(isMoving ? 'Режим перемещения: двигайте палец по экрану' : 'Режим выключен', 2000);
    });

    // 6. СБРОС МОДЕЛИ
    resetBtn.addEventListener('click', function () {
        if (!isModelPlaced || !activeModel) {
            showMessage('Сначала разместите модель!', 2000);
            return;
        }

        // Сбрасываем активную модель
        activeModel.setAttribute('position', '0 0 -2');
        activeModel.setAttribute('rotation', '0 0 0');
        activeModel.setAttribute('scale', '0.1 0.1 0.1');

        // Сбрасываем режимы
        currentMode = 'none';
        isRotating = false;
        isMoving = false;

        rotateBtn.style.background = '#ff9900';
        moveBtn.style.background = '#00cc66';

        console.log('🔄 Модель сброшена');
        showMessage('Модель сброшена в исходное положение', 2000);
    });

    // 7. СНИМОК ЭКРАНА
    shotBtn.addEventListener('click', function () {
        if (!isModelPlaced || !activeModel) {
            showMessage('Сначала разместите модель!', 2000);
            return;
        }

        console.log('📸 Создаем фото...');
        showMessage('Создаем фото...', 1500);

        setTimeout(captureScreenshot, 300);
    });

    // 8. ВКЛЮЧЕНИЕ ЖЕСТОВ УПРАВЛЕНИЯ
    function enableGestures() {
        console.log('✅ Жесты управления активированы для модели:', activeModel);

        // Удаляем старые обработчики
        scene.removeEventListener('touchstart', handleTouchStart);
        scene.removeEventListener('touchmove', handleTouchMove);
        scene.removeEventListener('touchend', handleTouchEnd);

        // Добавляем новые
        scene.addEventListener('touchstart', handleTouchStart, { passive: false });
        scene.addEventListener('touchmove', handleTouchMove, { passive: false });
        scene.addEventListener('touchend', handleTouchEnd);
    }

    // 9. ОБРАБОТЧИКИ КАСАНИЙ
    function handleTouchStart(e) {
        if (!isModelPlaced || !activeModel || (!isRotating && !isMoving)) return;

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            e.preventDefault();
        }
    }

    function handleTouchMove(e) {
        if (!isModelPlaced || !activeModel || (!isRotating && !isMoving)) return;

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;

            if (isRotating) {
                const rotation = activeModel.getAttribute('rotation');
                activeModel.setAttribute('rotation', {
                    x: rotation.x + deltaY * 0.5,
                    y: rotation.y + deltaX * 0.5,
                    z: rotation.z
                });
            }
            else if (isMoving) {
                const position = activeModel.getAttribute('position');
                activeModel.setAttribute('position', {
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
    }

    // 10. ФУНКЦИЯ СНИМКА ЭКРАНА
    function captureScreenshot() {
        try {
            // Ждем рендера
            setTimeout(() => {
                const canvases = document.querySelectorAll('canvas');

                if (canvases.length === 0) {
                    showMessage('Ошибка: canvas не найден', 2000);
                    return;
                }

                // Ищем canvas сцены A-Frame
                let targetCanvas = scene.canvas || canvases[0];

                // Ищем самый большой canvas
                canvases.forEach(canvas => {
                    if (canvas.width > 300 && canvas.height > 300) {
                        targetCanvas = canvas;
                    }
                });

                console.log('📸 Canvas размер:', targetCanvas.width, 'x', targetCanvas.height);

                // Создаем финальный canvas
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = targetCanvas.width;
                finalCanvas.height = targetCanvas.height;
                const ctx = finalCanvas.getContext('2d');

                // Фон
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

                // Копируем
                ctx.drawImage(targetCanvas, 0, 0);

                // Водяной знак
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = 'bold 28px Pacifico';
                ctx.fillText('🎄 С Новым Годом!', 30, finalCanvas.height - 40);

                // Сохраняем
                saveImage(finalCanvas);
            }, 100);

        } catch (error) {
            console.error('Ошибка скриншота:', error);
            showMessage('Ошибка: ' + error.message, 3000);
        }
    }

    function saveImage(canvas) {
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

            const link = document.createElement('a');
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
            showMessage('Ошибка сохранения', 3000);
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
    console.log('=== ИНФОРМАЦИЯ СИСТЕМЫ ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Основная модель:', mainModel);
    console.log('Модель маркера:', markerModel);
    console.log('Сцена:', scene);

    // Проверка камеры
    setTimeout(() => {
        const video = document.querySelector('video');
        if (video && video.videoWidth > 0) {
            console.log('✅ Камера работает:', video.videoWidth, 'x', video.videoHeight);
        } else {
            console.warn('⚠️ Проблема с камерой');
            showMessage('Разрешите доступ к камере', 3000);
        }
    }, 3000);
});

// ===== КОМПОНЕНТ МАСШТАБИРОВАНИЯ =====

function addPinchZoomComponent() {
    console.log('🔄 Добавляем масштабирование...');

    if (pinchScaleComponentAdded) {
        console.log('✅ Масштабирование уже добавлено');
        return;
    }

    // Ждем A-Frame
    if (typeof AFRAME === 'undefined') {
        setTimeout(addPinchZoomComponent, 1000);
        return;
    }

    // Регистрируем компонент
    if (!AFRAME.components['pinch-scale']) {
        AFRAME.registerComponent('pinch-scale', {
            schema: {
                min: { default: 0.05 },
                max: { default: 0.3 }
            },

            init: function () {
                console.log('✅ Компонент масштабирования создан');

                this.initialDistance = null;
                this.initialScale = null;
                this.isScaling = false;

                this.handleTouchStart = this.handleTouchStart.bind(this);
                this.handleTouchMove = this.handleTouchMove.bind(this);
                this.handleTouchEnd = this.handleTouchEnd.bind(this);

                this.el.sceneEl.addEventListener('touchstart', this.handleTouchStart);
                this.el.sceneEl.addEventListener('touchmove', this.handleTouchMove, { passive: false });
                this.el.sceneEl.addEventListener('touchend', this.handleTouchEnd);
            },

            handleTouchStart: function (event) {
                if (event.touches.length === 2 && this.el.getAttribute('visible') === 'true') {
                    this.isScaling = true;
                    this.initialDistance = Math.sqrt(
                        Math.pow(event.touches[1].clientX - event.touches[0].clientX, 2) +
                        Math.pow(event.touches[1].clientY - event.touches[0].clientY, 2)
                    );
                    this.initialScale = this.el.getAttribute('scale');
                    event.preventDefault();

                    console.log('✌️ Начало масштабирования');

                    if (!localStorage.getItem('pinchHintShown')) {
                        showMessage('✌️ Используйте два пальца для масштабирования', 2000);
                        localStorage.setItem('pinchHintShown', 'true');
                    }
                }
            },

            handleTouchMove: function (event) {
                if (!this.isScaling || event.touches.length !== 2) return;

                const currentDistance = Math.sqrt(
                    Math.pow(event.touches[1].clientX - event.touches[0].clientX, 2) +
                    Math.pow(event.touches[1].clientY - event.touches[0].clientY, 2)
                );

                if (this.initialDistance && this.initialScale) {
                    const scaleFactor = currentDistance / this.initialDistance;
                    const minScale = this.data.min;
                    const maxScale = this.data.max;
                    const clampedScale = Math.max(minScale, Math.min(maxScale, scaleFactor));

                    const newScale = {
                        x: this.initialScale.x * clampedScale,
                        y: this.initialScale.y * clampedScale,
                        z: this.initialScale.z * clampedScale
                    };

                    this.el.setAttribute('scale', newScale);
                }

                event.preventDefault();
            },

            handleTouchEnd: function () {
                this.isScaling = false;
                this.initialDistance = null;
                this.initialScale = null;
            }
        });
    }

    // Добавляем компонент к активной модели
    if (window.activeModel) {
        window.activeModel.setAttribute('pinch-scale', {
            min: 0.05,
            max: 0.3
        });

        pinchScaleComponentAdded = true;
        console.log('✅ Компонент масштабирования добавлен к модели');
    } else {
        console.warn('⚠️ Активная модель не найдена для добавления масштабирования');
        setTimeout(addPinchZoomComponent, 1000);
    }
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ОТЛАДКИ =====

window.debugModel = function () {
    console.log('=== ОТЛАДКА МОДЕЛИ ===');
    console.log('Активная модель:', window.activeModel);
    console.log('Размещена:', window.isModelPlaced);

    const mainModel = document.querySelector('#mainModel');
    const markerModel = document.querySelector('#markerModel');

    console.log('Основная модель:');
    console.log('- Элемент:', mainModel);
    console.log('- Видимость:', mainModel ? mainModel.getAttribute('visible') : 'N/A');
    console.log('- Позиция:', mainModel ? mainModel.getAttribute('position') : 'N/A');
    console.log('- Масштаб:', mainModel ? mainModel.getAttribute('scale') : 'N/A');

    console.log('Модель маркера:');
    console.log('- Элемент:', markerModel);
    console.log('- Видимость:', markerModel ? markerModel.getAttribute('visible') : 'N/A');

    // Проверка GLTF модели
    if (mainModel && mainModel.components && mainModel.components['gltf-model']) {
        console.log('GLTF компонент:', mainModel.components['gltf-model']);
    }
};

window.showModel = function () {
    const mainModel = document.querySelector('#mainModel');
    if (mainModel) {
        mainModel.setAttribute('visible', 'true');
        mainModel.setAttribute('position', '0 0 -2');
        window.isModelPlaced = true;
        window.activeModel = mainModel;

        const placeBtn = document.getElementById('PlaceButton');
        if (placeBtn) {
            placeBtn.textContent = '✓ Размещено';
            placeBtn.style.background = '#00cc66';
        }

        console.log('✅ Модель принудительно показана');
        showMessage('Модель показана', 2000);
    }
};