// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let scene, camera, renderer;
let activeModel = null;
let currentMode = 'move';
let isInteracting = false;
let lastTouchX = 0, lastTouchY = 0;
let modelsContainer;

// Храним начальные данные для каждой модели
let modelInitialData = new Map();

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

        // Инициализация жестов
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

    // Кнопка вращения
    document.getElementById('rotate-btn').addEventListener('click', function () {
        currentMode = 'rotate';
        updateModeButtons();
        showMessage('Режим вращения: двигайте палец по ГОРИЗОНТАЛИ для вращения модели', 2000);
    });

    // Кнопка увеличения масштаба
    document.getElementById('scale-up-btn').addEventListener('click', function () {
        if (activeModel && !isModelFixed(activeModel)) {
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
        if (activeModel && !isModelFixed(activeModel)) {
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
        if (isModelFixed(activeModel)) {
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

// ===== ПРОВЕРКА ФИКСАЦИИ МОДЕЛИ =====
function isModelFixed(model) {
    return model && model.hasAttribute('data-fixed');
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

    // Создать новую модель - просто в сцене, без лишних контейнеров
    const model = document.createElement('a-entity');
    model.id = modelId;
    model.classList.add('draggable');
    model.setAttribute('gltf-model', modelData.path);
    model.setAttribute('scale', '0.5 0.5 0.5');
    model.setAttribute('position', '0 0 -3');
    model.setAttribute('rotation', '0 0 0');

    // Добавляем модель прямо в контейнер сцену
    modelsContainer.appendChild(model);
    activeModel = model;

    // Сохраняем начальные данные модели
    modelInitialData.set(modelId, {
        position: { x: 0, y: 0, z: -3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.5, y: 0.5, z: 0.5 }
    });

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

// ===== ИНИЦИАЛИЗАЦИЯ ЖЕСТОВ =====
function initGestures() {
    const canvas = renderer.domElement;
    if (!canvas) {
        console.error('Canvas не найден');
        return;
    }

    // Обработчики событий мыши и касаний
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('touchstart', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('touchmove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchend', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);

    // Предотвращаем стандартное поведение касаний
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

// ===== ОБРАБОТЧИКИ КАСАНИЙ =====
function onPointerDown(event) {
    event.preventDefault();

    // Получаем координаты касания
    const coords = getTouchCoords(event);
    if (!coords) return;

    const { x, y } = coords;

    // Находим модель под касанием
    const modelUnderTouch = getModelUnderTouch(x, y);

    if (modelUnderTouch) {
        // Если модель зафиксирована, игнорируем
        if (isModelFixed(modelUnderTouch)) {
            showMessage('Модель зафиксирована', 1500);
            isInteracting = false;
            return;
        }

        // Выбираем модель
        activeModel = modelUnderTouch;
        isInteracting = true;
        lastTouchX = x;
        lastTouchY = y;

        // Обновляем кнопку фиксации
        const fixBtn = document.getElementById('fix-btn');
        if (isModelFixed(activeModel)) {
            fixBtn.innerHTML = '🔓';
            fixBtn.style.backgroundColor = '#007AFF';
            fixBtn.style.color = 'white';
        } else {
            fixBtn.innerHTML = '🔒';
            fixBtn.style.backgroundColor = '';
            fixBtn.style.color = '';
        }

        showMessage('Модель выбрана', 1000);
    }
}

function onPointerMove(event) {
    if (!isInteracting || !activeModel || isModelFixed(activeModel)) return;

    event.preventDefault();

    const coords = getTouchCoords(event);
    if (!coords) return;

    const { x, y } = coords;

    const deltaX = x - lastTouchX;
    const deltaY = y - lastTouchY;

    if (currentMode === 'move') {
        // ПЕРЕМЕЩЕНИЕ модели
        const position = activeModel.getAttribute('position');
        const moveSpeed = 0.005;

        activeModel.setAttribute('position', {
            x: position.x + deltaX * moveSpeed,
            y: position.y - deltaY * moveSpeed, // Инвертируем Y
            z: position.z
        });
    }
    else if (currentMode === 'rotate') {
        // ВРАЩЕНИЕ модели вокруг своей оси Y
        const rotation = activeModel.getAttribute('rotation');
        const rotateSpeed = 1;

        // Вращаем ТОЛЬКО по оси Y (горизонтальное вращение)
        activeModel.setAttribute('rotation', {
            x: 0,
            y: rotation.y + deltaX * rotateSpeed,
            z: 0
        });
    }

    lastTouchX = x;
    lastTouchY = y;
}

function onPointerUp() {
    isInteracting = false;
}

// ===== ПОЛУЧЕНИЕ КООРДИНАТ КАСАНИЯ =====
function getTouchCoords(event) {
    let clientX, clientY;

    if (event.type.includes('touch')) {
        if (event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            return null;
        }
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    return { x: clientX, y: clientY };
}

// ===== ПОЛУЧЕНИЕ МОДЕЛИ ПОД КАСАНИЕМ =====
function getModelUnderTouch(x, y) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    // Преобразуем координаты касания в нормализованные координаты устройства
    const normalizedX = ((x - rect.left) / rect.width) * 2 - 1;
    const normalizedY = -((y - rect.top) / rect.height) * 2 + 1;

    // Создаем луч из камеры
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera);

    // Получаем все модели
    const models = scene.querySelectorAll('.draggable');
    let closestIntersection = null;
    let closestDistance = Infinity;

    models.forEach(model => {
        if (model.object3D) {
            try {
                // Создаем ограничивающий бокс для модели
                const box = new THREE.Box3().setFromObject(model.object3D);

                // Проверяем пересечение луча с ограничивающим боксом
                if (raycaster.ray.intersectsBox(box)) {
                    // Проверяем более точное пересечение с мешами
                    const intersects = raycaster.intersectObject(model.object3D, true);

                    if (intersects.length > 0) {
                        const distance = intersects[0].distance;
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestIntersection = model;
                        }
                    }
                }
            } catch (error) {
                console.warn('Ошибка при проверке пересечения:', error);
            }
        }
    });

    return closestIntersection;
}

// ===== СКРИНШОТ =====
function takeScreenshot() {
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

        // Копируем содержимое canvas сцены
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

    // Очищаем хранилища данных
    modelInitialData.clear();

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