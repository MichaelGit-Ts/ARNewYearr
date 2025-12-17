// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let scene, camera, renderer;
let activeModel = null;
let currentMode = 'move'; // 'move', 'rotate', 'scale'
let isInteracting = false;
let lastTouchX = 0, lastTouchY = 0;
let initialDistance = 0;
let initialScale = { x: 1, y: 1, z: 1 };
let modelsContainer;
let hammerManager;

// Переменные для управления камерой устройства
let currentCameraMode = 'user'; // 'user' - передняя, 'environment' - задняя
let currentStream = null;
let isCameraActive = false;

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Приложение запускается');

    // Получаем элементы
    scene = document.querySelector('a-scene');
    modelsContainer = document.getElementById('models-container');
    const loading = document.getElementById('loading');
    const message = document.getElementById('message');

    // Показываем сообщение при старте
    showMessage('Запуск приложения...', 2000);

    // Инициализация UI
    initUI();

    // Инициализация жестов
    initGestures();

    // Запускаем камеру устройства
    await startDeviceCamera();

    // Когда сцена загружена
    scene.addEventListener('loaded', function () {
        console.log('✅ Сцена загружена');
        loading.style.display = 'none';

        // Получаем Three.js объекты
        const cameraEl = document.querySelector('[camera]');
        camera = cameraEl.getObject3D('camera');
        renderer = scene.renderer;

        // Включаем preserveDrawingBuffer для скриншотов
        if (renderer) {
            renderer.preserveDrawingBuffer = true;
        }

        // Показываем инструкцию
        setTimeout(() => {
            showMessage('Выберите модель из списка 📦', 4000);
        }, 1000);
    });
});

// ===== ЗАПУСК КАМЕРЫ УСТРОЙСТВА =====
async function startDeviceCamera() {
    try {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        loading.textContent = 'Запуск камеры...';

        // Останавливаем предыдущий поток
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }

        // Запрашиваем доступ к камере
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentCameraMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        // Создаем видео элемент
        const videoElement = document.createElement('video');
        videoElement.id = 'device-video';
        videoElement.autoplay = true;
        videoElement.playsinline = true;
        videoElement.style.display = 'none';
        videoElement.srcObject = currentStream;

        // Ждем загрузки видео
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve();
            };
        });

        // Добавляем видео в DOM
        if (!document.getElementById('device-video')) {
            document.body.appendChild(videoElement);
        }

        isCameraActive = true;
        console.log('✅ Камера устройства запущена');

        // Обновляем кнопку
        updateCameraButton();

    } catch (error) {
        console.error('❌ Ошибка камеры устройства:', error);
        isCameraActive = false;

        let errorMsg = 'Не удалось запустить камеру. ';
        if (error.name === 'NotAllowedError') {
            errorMsg += 'Разрешите доступ к камере в настройках браузера.';
        } else if (error.name === 'NotFoundError') {
            errorMsg += 'Камера не найдена.';
        } else {
            errorMsg += 'Попробуйте перезагрузить страницу.';
        }

        showMessage(errorMsg, 4000);
    } finally {
        const loading = document.getElementById('loading');
        loading.style.display = 'none';
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ КАМЕРЫ УСТРОЙСТВА =====
async function switchDeviceCamera() {
    try {
        showMessage('Переключаем камеру...', 1500);

        // Меняем режим камеры
        currentCameraMode = currentCameraMode === 'user' ? 'environment' : 'user';

        // Перезапускаем камеру
        await startDeviceCamera();

        showMessage(`Камера: ${currentCameraMode === 'user' ? 'Передняя' : 'Задняя'}`, 2000);

    } catch (error) {
        console.error('❌ Ошибка переключения камеры:', error);
        showMessage('Не удалось переключить камеру', 2000);
    }
}

// ===== ОБНОВЛЕНИЕ КНОПКИ КАМЕРЫ =====
function updateCameraButton() {
    const switchBtn = document.getElementById('switch-camera-btn');
    if (!switchBtn) return;

    if (currentCameraMode === 'user') {
        switchBtn.innerHTML = '📱➡️';
        switchBtn.title = 'Переключить на заднюю камеру';
    } else {
        switchBtn.innerHTML = '📷⬅️';
        switchBtn.title = 'Переключить на переднюю камеру';
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ UI =====
function initUI() {
    console.log('🔄 Инициализация UI');

    // Заполнение списка моделей
    const modelList = document.getElementById('model-list');
    models.forEach(model => {
        const icon = document.createElement('div');
        icon.className = 'model-icon';
        icon.innerHTML = model.icon;
        icon.title = model.name;
        icon.dataset.modelId = model.id;
        icon.dataset.modelPath = model.path;
        icon.addEventListener('click', () => addModelToScene(model));
        modelList.appendChild(icon);
    });

    // Кнопка выбора моделей
    document.getElementById('model-select-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        const modelList = document.getElementById('model-list');
        modelList.style.display = modelList.style.display === 'grid' ? 'none' : 'grid';
    });

    // Кнопка перемещения
    document.getElementById('move-btn').addEventListener('click', function () {
        currentMode = 'move';
        updateModeButtons();
        showMessage('Режим перемещения: перемещайте модель пальцем', 2000);
    });

    // Кнопка вращения
    document.getElementById('rotate-btn').addEventListener('click', function () {
        currentMode = 'rotate';
        updateModeButtons();
        showMessage('Режим вращения: вращайте модель пальцем', 2000);
    });

    // Кнопка увеличения масштаба
    document.getElementById('scale-up-btn').addEventListener('click', function () {
        if (activeModel) {
            const scale = activeModel.getAttribute('scale');
            const newScale = {
                x: scale.x * 1.2,
                y: scale.y * 1.2,
                z: scale.z * 1.2
            };
            activeModel.setAttribute('scale', newScale);
            showMessage('Масштаб увеличен', 1500);
        }
    });

    // Кнопка уменьшения масштаба
    document.getElementById('scale-down-btn').addEventListener('click', function () {
        if (activeModel) {
            const scale = activeModel.getAttribute('scale');
            const newScale = {
                x: scale.x * 0.8,
                y: scale.y * 0.8,
                z: scale.z * 0.8
            };
            activeModel.setAttribute('scale', newScale);
            showMessage('Масштаб уменьшен', 1500);
        }
    });

    // Кнопка фотографии
    document.getElementById('photo-btn').addEventListener('click', takeScreenshot);

    // Кнопка переключения камеры
    document.getElementById('switch-camera-btn').addEventListener('click', switchDeviceCamera);

    // Кнопка сброса
    document.getElementById('reset-btn').addEventListener('click', resetScene);

    // Скрыть выпадающий список при клике вне его
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.dropdown-container')) {
            document.getElementById('model-list').style.display = 'none';
        }
    });

    updateModeButtons();
    updateCameraButton();
}

// ===== ОБНОВЛЕНИЕ КНОПОК РЕЖИМОВ =====
function updateModeButtons() {
    const moveBtn = document.getElementById('move-btn');
    const rotateBtn = document.getElementById('rotate-btn');

    moveBtn.classList.toggle('active', currentMode === 'move');
    rotateBtn.classList.toggle('active', currentMode === 'rotate');
}

// ===== ДОБАВЛЕНИЕ МОДЕЛИ НА СЦЕНУ =====
function addModelToScene(modelData) {
    console.log('➕ Добавляем модель:', modelData.name);

    // Скрыть список моделей
    document.getElementById('model-list').style.display = 'none';

    // Показать индикатор загрузки
    document.getElementById('loading').style.display = 'block';
    showMessage(`Загрузка ${modelData.name}...`, 2000);

    // Создать новую модель
    const model = document.createElement('a-entity');
    model.id = `model-${modelData.id}`;
    model.classList.add('draggable');
    model.setAttribute('gltf-model', modelData.path);
    model.setAttribute('scale', '0.5 0.5 0.5');
    model.setAttribute('position', '0 0 -3');
    model.setAttribute('rotation', '0 0 0');

    // Добавить компонент для обработки событий
    model.setAttribute('gesture-handler', '');

    modelsContainer.appendChild(model);
    activeModel = model;

    // Ждать загрузки модели
    model.addEventListener('model-loaded', function () {
        console.log('✅ Модель загружена');
        document.getElementById('loading').style.display = 'none';

        // Показать сетку для ориентации
        document.getElementById('grid').setAttribute('visible', 'true');

        showMessage(`${modelData.name} размещена! Используйте жесты для управления`, 3000);

        // Настроить жесты для этой модели
        setupModelGestures(model);
    });

    // Обработка ошибок загрузки
    model.addEventListener('model-error', function (e) {
        console.error('❌ Ошибка загрузки модели:', e);
        document.getElementById('loading').style.display = 'none';
        showMessage('Ошибка загрузки модели. Проверьте путь к файлу.', 3000);
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ ЖЕСТОВ =====
function initGestures() {
    const canvas = scene.canvas;
    if (!canvas) {
        console.error('Canvas не найден');
        return;
    }

    // Создаем менеджер жестов
    hammerManager = new Hammer.Manager(canvas, {
        recognizers: [
            [Hammer.Pan, { direction: Hammer.DIRECTION_ALL, threshold: 0 }],
            [Hammer.Rotate, { threshold: 0 }],
            [Hammer.Pinch, { threshold: 0 }],
            [Hammer.Tap]
        ]
    });

    // Обработчик начала жеста
    hammerManager.on('panstart rotatestart pinchstart', function (e) {
        if (!activeModel) return;

        isInteracting = true;

        if (e.type === 'panstart' && currentMode === 'move') {
            lastTouchX = e.center.x;
            lastTouchY = e.center.y;
        }

        if (e.type === 'rotatestart' && currentMode === 'rotate') {
            // Сохраняем начальное вращение
        }

        if (e.type === 'pinchstart') {
            initialDistance = e.scale;
            initialScale = activeModel.getAttribute('scale');
        }
    });

    // Обработчик движения жеста
    hammerManager.on('panmove rotatemove pinchmove', function (e) {
        if (!activeModel || !isInteracting) return;

        if (e.type === 'panmove' && currentMode === 'move') {
            // Перемещение модели
            const deltaX = (e.center.x - lastTouchX) * 0.01;
            const deltaY = (e.center.y - lastTouchY) * -0.01;

            const position = activeModel.getAttribute('position');
            activeModel.setAttribute('position', {
                x: position.x + deltaX,
                y: position.y + deltaY,
                z: position.z
            });

            lastTouchX = e.center.x;
            lastTouchY = e.center.y;
        }

        if (e.type === 'rotatemove' && currentMode === 'rotate') {
            // Вращение модели
            const rotation = activeModel.getAttribute('rotation');
            activeModel.setAttribute('rotation', {
                x: rotation.x,
                y: rotation.y + e.rotation * 0.5,
                z: rotation.z
            });
        }

        if (e.type === 'pinchmove') {
            // Масштабирование модели
            const scaleFactor = e.scale / initialDistance;
            const newScale = {
                x: initialScale.x * scaleFactor,
                y: initialScale.y * scaleFactor,
                z: initialScale.z * scaleFactor
            };

            // Ограничиваем масштабирование
            const minScale = 0.1;
            const maxScale = 5;
            newScale.x = Math.max(minScale, Math.min(maxScale, newScale.x));
            newScale.y = Math.max(minScale, Math.min(maxScale, newScale.y));
            newScale.z = Math.max(minScale, Math.min(maxScale, newScale.z));

            activeModel.setAttribute('scale', newScale);
        }
    });

    // Обработчик окончания жеста
    hammerManager.on('panend rotateend pinchend', function () {
        isInteracting = false;
    });

    // Обработчик тапа для выбора модели
    hammerManager.on('tap', function (e) {
        // Получаем позицию клика в нормализованных координатах
        const rect = canvas.getBoundingClientRect();
        const x = ((e.center.x - rect.left) / rect.width) * 2 - 1;
        const y = -((e.center.y - rect.top) / rect.height) * 2 + 1;

        // Создаем рейкастер
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

        // Получаем все модели
        const models = scene.querySelectorAll('.draggable');
        let closestIntersection = null;
        let closestDistance = Infinity;

        models.forEach(model => {
            if (model.object3D) {
                // Обходим все меши в модели
                model.object3D.traverse(child => {
                    if (child.isMesh) {
                        const intersects = raycaster.intersectObject(child, true);
                        if (intersects.length > 0) {
                            const distance = intersects[0].distance;
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestIntersection = model;
                            }
                        }
                    }
                });
            }
        });

        if (closestIntersection) {
            activeModel = closestIntersection;
            showMessage(`Выбрана модель ${closestIntersection.id}`, 1500);
        }
    });
}

// ===== НАСТРОЙКА ЖЕСТОВ ДЛЯ КОНКРЕТНОЙ МОДЕЛИ =====
function setupModelGestures(model) {
    // Добавляем анимацию при выборе
    model.addEventListener('mouseenter', function () {
        if (model !== activeModel) {
            model.setAttribute('animation', {
                property: 'scale',
                to: '0.55 0.55 0.55',
                dur: 200,
                easing: 'easeOutElastic'
            });
        }
    });

    model.addEventListener('mouseleave', function () {
        if (model !== activeModel) {
            model.setAttribute('animation', {
                property: 'scale',
                to: '0.5 0.5 0.5',
                dur: 200,
                easing: 'easeOutElastic'
            });
        }
    });
}

// ===== СКРИНШОТ С КАМЕРОЙ УСТРОЙСТВА =====
async function takeScreenshot() {
    if (!activeModel) {
        showMessage('Сначала разместите модель!', 2000);
        return;
    }

    showMessage('Создаем фото...', 1500);

    // Скрываем UI на время скриншота
    const uiContainer = document.querySelector('.ui-container');
    const originalDisplay = uiContainer.style.display;
    uiContainer.style.display = 'none';

    // Ждем следующего кадра для рендера
    requestAnimationFrame(async () => {
        try {
            const canvas = scene.canvas;
            if (!canvas) {
                throw new Error('Canvas не найден');
            }

            // Получаем видео с камеры устройства
            const videoElement = document.getElementById('device-video');

            // Создаем новый canvas
            const screenshotCanvas = document.createElement('canvas');
            const ctx = screenshotCanvas.getContext('2d');

            if (videoElement && videoElement.srcObject && videoElement.videoWidth > 0 && isCameraActive) {
                // Если камера устройства доступна
                screenshotCanvas.width = videoElement.videoWidth;
                screenshotCanvas.height = videoElement.videoHeight;

                // Ждем немного для стабилизации видео
                await new Promise(resolve => setTimeout(resolve, 50));

                // Рисуем видео с камеры (фон)
                ctx.drawImage(videoElement, 0, 0, screenshotCanvas.width, screenshotCanvas.height);

                // Рисуем 3D сцену поверх видео
                const scaleFactor = Math.min(
                    screenshotCanvas.width / canvas.width,
                    screenshotCanvas.height / canvas.height
                );

                const scaledWidth = canvas.width * scaleFactor;
                const scaledHeight = canvas.height * scaleFactor;
                const x = (screenshotCanvas.width - scaledWidth) / 2;
                const y = (screenshotCanvas.height - scaledHeight) / 2;

                ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
            } else {
                // Если камера устройства недоступна, делаем обычный скриншот
                screenshotCanvas.width = canvas.width;
                screenshotCanvas.height = canvas.height;

                // Черный фон
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, screenshotCanvas.width, screenshotCanvas.height);

                // Рисуем 3D сцену
                ctx.drawImage(canvas, 0, 0);
            }

            // Добавляем водяной знак
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('AR Quick Look', 20, screenshotCanvas.height - 30);

            // Добавляем информацию о камере
            ctx.font = '14px Arial';
            ctx.fillText(`Камера: ${currentCameraMode === 'user' ? 'Передняя' : 'Задняя'}`,
                20, screenshotCanvas.height - 10);

            // Восстанавливаем UI
            uiContainer.style.display = originalDisplay;

            // Сохраняем изображение
            saveImage(screenshotCanvas);

        } catch (error) {
            console.error('❌ Ошибка при создании скриншота:', error);
            showMessage('Ошибка при создании фото', 2000);

            // Восстанавливаем UI в случае ошибки
            uiContainer.style.display = originalDisplay;
        }
    });
}

function saveImage(canvas) {
    try {
        const dataUrl = canvas.toDataURL('image/png');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const link = document.createElement('a');
        link.download = `ar-screenshot-${timestamp}.png`;
        link.href = dataUrl;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            showSaveInstructions();
        }, 100);

    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showMessage('Ошибка сохранения фото', 2000);
    }
}

function showSaveInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
        showMessage('Фото создано! Нажмите на миниатюру вверху → "Поделиться" → "Сохранить в Фото"', 4000);
    } else if (isAndroid) {
        showMessage('Фото сохранено в галерею!', 3000);
    } else {
        showMessage('Фото скачано в папку "Загрузки"', 3000);
    }
}

// ===== СБРОС СЦЕНЫ =====
function resetScene() {
    if (!confirm('Удалить все модели со сцены?')) return;

    while (modelsContainer.firstChild) {
        modelsContainer.removeChild(modelsContainer.firstChild);
    }

    activeModel = null;
    currentMode = 'move';
    updateModeButtons();

    // Скрыть сетку
    document.getElementById('grid').setAttribute('visible', 'false');

    showMessage('Сцена очищена', 2000);
}

// ===== ПОКАЗАТЬ СООБЩЕНИЕ =====
function showMessage(text, duration = 3000) {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, duration);
}

// ===== КОМПОНЕНТ ДЛЯ ОБРАБОТКИ ЖЕСТОВ =====
AFRAME.registerComponent('gesture-handler', {
    schema: {
        enabled: { default: true }
    },

    init: function () {
        this.el.addEventListener('model-loaded', this.onModelLoaded.bind(this));
    },

    onModelLoaded: function () {
        console.log('Компонент жестов активирован для модели');
    }
});

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
window.addEventListener('load', function () {
    console.log('Страница полностью загружена');

    // Проверяем поддержку WebGL
    if (!scene.hasWebGL) {
        showMessage('Ваше устройство не поддерживает WebGL. Функции 3D недоступны.', 5000);
    }
});

// ===== ОБРАБОТКА ОЧИСТКИ =====
window.addEventListener('beforeunload', function () {
    // Останавливаем камеру при закрытии страницы
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    // Уничтожаем менеджер жестов
    if (hammerManager) {
        hammerManager.destroy();
    }
});

// ===== ОБРАБОТКА ВИДИМОСТИ СТРАНИЦЫ =====
document.addEventListener('visibilitychange', function () {
    if (document.hidden && currentStream) {
        // Останавливаем камеру когда страница не активна
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
        isCameraActive = false;
    }
});