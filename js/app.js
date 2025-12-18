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

// Переменные для отслеживания вращения
let lastRotationY = 0; // Изменил с X на Y для горизонтального вращения

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Приложение запускается');

    // Получаем элементы
    scene = document.querySelector('a-scene');
    modelsContainer = document.getElementById('models-container');
    const loading = document.getElementById('loading');
    const message = document.getElementById('message');

    // Показываем сообщение при старте
    showMessage('Камера загружается...', 3000);

    // Инициализация UI
    initUI();

    // Инициализация жестов
    initGestures();

    // Когда сцена загружена
    scene.addEventListener('loaded', function () {
        console.log('✅ Сцена загружена');
        loading.style.display = 'none';

        // Получаем Three.js объекты
        const cameraEl = document.querySelector('[camera]');
        camera = cameraEl.getObject3D('camera');
        renderer = scene.renderer;

        // Показываем инструкцию
        setTimeout(() => {
            showMessage('Выберите модель из списка 📦', 4000);
        }, 1000);
    });
});

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

    // Кнопка вращения (ГОРИЗОНТАЛЬНОЕ ВРАЩЕНИЕ)
    document.getElementById('rotate-btn').addEventListener('click', function () {
        currentMode = 'rotate';
        updateModeButtons();
        showMessage('Режим вращения: двигайте палец по ГОРИЗОНТАЛИ для вращения модели', 2000);
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

    // Кнопка сброса
    document.getElementById('reset-btn').addEventListener('click', resetScene);

    // Скрыть выпадающий список при клике вне его
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.dropdown-container')) {
            document.getElementById('model-list').style.display = 'none';
        }
    });

    updateModeButtons();
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

// ===== ИНИЦИАЛИЗАЦИЯ ЖЕСТОВ (горизонтальное вращение по Y) =====
function initGestures() {
    const canvas = scene.canvas;
    if (!canvas) {
        console.error('Canvas не найден');
        return;
    }

    // Создаем менеджер жестов
    hammerManager = new Hammer.Manager(canvas, {
        recognizers: [
            [Hammer.Pan, { direction: Hammer.DIRECTION_HORIZONTAL, threshold: 0 }], // Только горизонтальное движение
            [Hammer.Pinch, { threshold: 0 }],
            [Hammer.Tap]
        ]
    });

    // Обработчик начала жеста
    hammerManager.on('panstart pinchstart', function (e) {
        if (!activeModel) return;

        isInteracting = true;

        if (e.type === 'panstart') {
            lastTouchX = e.center.x;
            lastTouchY = e.center.y;

            // Сохраняем текущее вращение модели по оси Y (для горизонтального вращения)
            const rotation = activeModel.getAttribute('rotation');
            lastRotationY = rotation.y; // Изменил на Y
        }

        if (e.type === 'pinchstart') {
            initialDistance = e.scale;
            initialScale = activeModel.getAttribute('scale');
        }
    });

    // Обработчик движения жеста
    hammerManager.on('panmove pinchmove', function (e) {
        if (!activeModel || !isInteracting) return;

        if (e.type === 'panmove') {
            if (currentMode === 'move') {
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
            else if (currentMode === 'rotate') {
                // ГОРИЗОНТАЛЬНОЕ ВРАЩЕНИЕ модели вокруг своей оси Y
                const deltaX = (e.center.x - lastTouchX) * 0.5; // Берем только горизонтальное движение

                // Вращаем только по оси Y (горизонтальное вращение)
                activeModel.setAttribute('rotation', {
                    x: 0,                       // X не меняем
                    y: lastRotationY + deltaX,  // Горизонтальное движение = вращение по Y
                    z: 0                        // Z не меняем
                });
            }
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
    hammerManager.on('panend pinchend', function () {
        isInteracting = false;

        // Сохраняем последнее вращение
        if (activeModel) {
            const rotation = activeModel.getAttribute('rotation');
            lastRotationY = rotation.y; // Сохраняем Y
        }
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

            // Сохраняем вращение выбранной модели
            const rotation = activeModel.getAttribute('rotation');
            lastRotationY = rotation.y; // Сохраняем Y

            showMessage(`Выбрана модель ${closestIntersection.id}`, 1500);
        }
    });
}

// ===== ФУНКЦИЯ ДЛЯ РУЧНОГО ВРАЩЕНИЯ ПО ОСИ Y =====
function rotateModelY(angle) {
    if (!activeModel) return;

    // Получаем текущее вращение
    const rotation = activeModel.getAttribute('rotation');

    // Вращаем только вокруг локальной оси Y (горизонтальное вращение)
    activeModel.setAttribute('rotation', {
        x: 0,                       // X не меняем
        y: rotation.y + angle,      // Вращаем по Y
        z: 0                        // Z не меняем
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

// ===== СКРИНШОТ =====
function takeScreenshot() {
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
    setTimeout(() => {
        const canvas = scene.canvas;
        if (!canvas) {
            showMessage('Ошибка: canvas не найден', 2000);
            uiContainer.style.display = originalDisplay;
            return;
        }

        // Создаем новый canvas
        const screenshotCanvas = document.createElement('canvas');
        screenshotCanvas.width = canvas.width;
        screenshotCanvas.height = canvas.height;
        const ctx = screenshotCanvas.getContext('2d');

        // Заливаем фон
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, screenshotCanvas.width, screenshotCanvas.height);

        // Копируем содержимое
        ctx.drawImage(canvas, 0, 0);

        // Добавляем водяной знак
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('AR Quick Look', 20, screenshotCanvas.height - 30);

        // Восстанавливаем UI
        uiContainer.style.display = originalDisplay;

        // Сохраняем изображение
        saveImage(screenshotCanvas);
    }, 100);
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