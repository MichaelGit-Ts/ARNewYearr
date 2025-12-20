// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let scene, camera, renderer;
let activeModel = null;
let currentMode = 'move'; // 'move', 'rotate'
let isInteracting = false;
let lastTouchX = 0, lastTouchY = 0;
let modelsContainer;
let hammerManager;

// Переменные для отслеживания вращения
let lastRotationY = 0;
let originalRotation = 0; // Сохраняем начальное вращение для каждой модели
let originalPosition = { x: 0, y: 0, z: -3 }; // Начальная позиция

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Приложение запускается');

    // Получаем элементы
    scene = document.querySelector('a-scene');
    modelsContainer = document.getElementById('models-container');
    const loading = document.getElementById('loading');
    const message = document.getElementById('message');

    // Показываем сообщение при старте
    showMessage('Сцена загружается...', 3000);

    // Инициализация UI
    initUI();

    // Когда сцена загружена
    scene.addEventListener('loaded', function () {
        console.log('✅ Сцена загружена');
        loading.style.display = 'none';

        // Получаем Three.js объекты
        const cameraEl = document.querySelector('[camera]');
        camera = cameraEl.getObject3D('camera');
        renderer = scene.renderer;

        // Инициализация жестов после загрузки сцены
        initGestures();

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
        if (activeModel && !activeModel.hasAttribute('data-fixed')) {
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
        if (activeModel && !activeModel.hasAttribute('data-fixed')) {
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

    // Кнопка фиксации модели
    document.getElementById('fix-btn').addEventListener('click', function () {
        if (!activeModel) {
            showMessage('Сначала выберите модель для фиксации!', 2000);
            return;
        }

        // Переключаем состояние фиксации
        if (activeModel.hasAttribute('data-fixed')) {
            // Разблокировать модель
            activeModel.removeAttribute('data-fixed');
            this.innerHTML = '🔒';
            this.style.backgroundColor = '';
            this.style.color = '';
            showMessage('Модель разблокирована', 1500);
        } else {
            // Заблокировать модель
            activeModel.setAttribute('data-fixed', 'true');
            this.innerHTML = '🔓';
            this.style.backgroundColor = '#007AFF';
            this.style.color = 'white';

            // Снимаем выделение с текущей модели
            activeModel = null;
            showMessage('Модель зафиксирована. Можно разместить новую модель', 2500);
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

    // Генерируем уникальный ID для модели
    const modelId = `model-${modelData.id}-${Date.now()}`;

    // Создать новую модель
    const model = document.createElement('a-entity');
    model.id = modelId;
    model.classList.add('draggable');
    model.setAttribute('gltf-model', modelData.path);
    model.setAttribute('scale', '0.5 0.5 0.5');
    model.setAttribute('position', '0 0 -3');
    model.setAttribute('rotation', '0 0 0');

    modelsContainer.appendChild(model);
    activeModel = model;
    originalRotation = 0; // Сбрасываем вращение для новой модели
    lastRotationY = 0;

    // Ждать загрузки модели
    model.addEventListener('model-loaded', function () {
        console.log('✅ Модель загружена');
        document.getElementById('loading').style.display = 'none';

        showMessage(`${modelData.name} размещена! Используйте жесты для управления`, 3000);
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
    const canvas = renderer.domElement;
    if (!canvas) {
        console.error('Canvas не найден');
        return;
    }

    // Создаем менеджер жестов ТОЛЬКО для pan и tap
    hammerManager = new Hammer.Manager(canvas, {
        recognizers: [
            [Hammer.Pan, { direction: Hammer.DIRECTION_ALL, threshold: 0 }], // Разрешаем все направления
            [Hammer.Tap]
        ]
    });

    // Обработчик начала жеста
    hammerManager.on('panstart', function (e) {
        // Сохраняем начальные координаты
        lastTouchX = e.center.x;
        lastTouchY = e.center.y;

        // Если нет активной модели или она зафиксирована, не начинаем взаимодействие
        if (!activeModel || activeModel.hasAttribute('data-fixed')) {
            isInteracting = false;
            return;
        }

        // Проверяем, есть ли модель под пальцем
        if (!isModelUnderTouch(e.center.x, e.center.y)) {
            isInteracting = false;
            return;
        }

        isInteracting = true;

        // Сохраняем начальное вращение модели (для режима вращения)
        if (currentMode === 'rotate') {
            const rotation = activeModel.getAttribute('rotation');
            lastRotationY = rotation.y;
        }
    });

    // Обработчик движения жеста
    hammerManager.on('panmove', function (e) {
        if (!activeModel || !isInteracting || activeModel.hasAttribute('data-fixed')) return;

        if (currentMode === 'move') {
            // ПЕРЕМЕЩЕНИЕ модели в мировых координатах
            const deltaX = (e.center.x - lastTouchX) * 0.002;
            const deltaY = (e.center.y - lastTouchY) * -0.002; // Инвертируем Y для естественного перемещения

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
            const newRotationY = lastRotationY + deltaX;
            activeModel.setAttribute('rotation', {
                x: 0,
                y: newRotationY,
                z: 0
            });
        }
    });

    // Обработчик окончания жеста
    hammerManager.on('panend', function () {
        isInteracting = false;

        // Сохраняем последнее вращение (для режима вращения)
        if (activeModel && currentMode === 'rotate' && !activeModel.hasAttribute('data-fixed')) {
            const rotation = activeModel.getAttribute('rotation');
            lastRotationY = rotation.y;
        }
    });

    // Обработчик тапа для выбора модели
    hammerManager.on('tap', function (e) {
        console.log('Tap detected at:', e.center.x, e.center.y);

        // Проверяем, есть ли модель под пальцем
        const selectedModel = getModelUnderTouch(e.center.x, e.center.y);

        if (selectedModel) {
            console.log('Model found:', selectedModel.id);

            // Проверяем, не зафиксирована ли модель
            if (selectedModel.hasAttribute('data-fixed')) {
                showMessage('Эта модель зафиксирована. Выберите другую модель', 2000);
                return;
            }

            // Выбираем модель
            activeModel = selectedModel;

            // Сохраняем вращение выбранной модели
            const rotation = activeModel.getAttribute('rotation');
            lastRotationY = rotation.y;

            // Обновляем кнопку фиксации
            const fixBtn = document.getElementById('fix-btn');
            if (activeModel.hasAttribute('data-fixed')) {
                fixBtn.innerHTML = '🔓';
                fixBtn.style.backgroundColor = '#007AFF';
                fixBtn.style.color = 'white';
            } else {
                fixBtn.innerHTML = '🔒';
                fixBtn.style.backgroundColor = '';
                fixBtn.style.color = '';
            }

            showMessage(`Выбрана модель`, 1500);
        } else {
            console.log('No model found under touch');
        }
    });
}

// ===== ФУНКЦИЯ ПРОВЕРКИ, НАХОДИТСЯ ЛИ МОДЕЛЬ ПОД КАСАНИЕМ =====
function isModelUnderTouch(touchX, touchY) {
    return getModelUnderTouch(touchX, touchY) !== null;
}

// ===== ФУНКЦИЯ ПОЛУЧЕНИЯ МОДЕЛИ ПОД КАСАНИЕМ =====
function getModelUnderTouch(touchX, touchY) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    // Преобразуем координаты касания в нормализованные координаты устройства (-1 to 1)
    const x = ((touchX - rect.left) / rect.width) * 2 - 1;
    const y = -((touchY - rect.top) / rect.height) * 2 + 1;

    // Создаем луч из камеры
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    // Получаем все модели
    const models = scene.querySelectorAll('.draggable');
    let closestIntersection = null;
    let closestDistance = Infinity;

    models.forEach(model => {
        // Пропускаем зафиксированные модели
        if (model.hasAttribute('data-fixed')) {
            return;
        }

        if (model.object3D) {
            // Проверяем пересечение луча с моделью
            const intersects = raycaster.intersectObject(model.object3D, true);

            if (intersects.length > 0) {
                const distance = intersects[0].distance;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIntersection = model;
                }
            }
        }
    });

    return closestIntersection;
}

// ===== ФУНКЦИЯ ДЛЯ РУЧНОГО ВРАЩЕНИЯ ПО ОСИ Y =====
function rotateModelY(angle) {
    if (!activeModel || activeModel.hasAttribute('data-fixed')) return;

    // Получаем текущее вращение
    const rotation = activeModel.getAttribute('rotation');

    // Вращаем только вокруг локальной оси Y (горизонтальное вращение)
    activeModel.setAttribute('rotation', {
        x: 0,
        y: rotation.y + angle,
        z: 0
    });

    lastRotationY = rotation.y + angle;
}

// ===== СКРИНШОТ =====
function takeScreenshot() {
    // Проверяем, есть ли хотя бы одна модель на сцене
    const models = modelsContainer.querySelectorAll('.draggable');
    if (models.length === 0) {
        showMessage('Сначала разместите хотя бы одну модель!', 2000);
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

    // Сбросить кнопку фиксации
    const fixBtn = document.getElementById('fix-btn');
    fixBtn.innerHTML = '🔒';
    fixBtn.style.backgroundColor = '';
    fixBtn.style.color = '';

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