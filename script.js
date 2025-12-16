// ===== УЛУЧШЕННЫЙ КОМПОНЕНТ ДЛЯ МАСШТАБИРОВАНИЯ ДВУМЯ ПАЛЬЦАМИ =====

// 1. Компонент для жеста pinch-to-zoom (без лишних подсказок)
AFRAME.registerComponent('pinch-scale', {
    schema: {
        min: { type: 'number', default: 0.05 },
        max: { type: 'number', default: 0.5 },
        sensitivity: { type: 'number', default: 0.001 }
    },

    init: function () {
        this.initialDistance = null;
        this.initialScale = null;
        this.isPinching = false;
        this.pinchHintShown = false;

        console.log('Компонент pinch-scale инициализирован');

        // Слушаем события на всей сцене для захвата жестов
        this.sceneEl = this.el.sceneEl;
        this.bindEvents();
    },

    bindEvents: function () {
        // Используем пассивные события для лучшей производительности
        this.sceneEl.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.sceneEl.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.sceneEl.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.sceneEl.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
    },

    handleTouchStart: function (event) {
        // Если касаний два и модель размещена
        if (event.touches.length === 2 && this.isModelVisible()) {
            this.isPinching = true;
            this.initialDistance = this.getDistance(event.touches[0], event.touches[1]);
            this.initialScale = this.el.getAttribute('scale');

            // Показываем подсказку только один раз при первом использовании
            if (!this.pinchHintShown) {
                this.showPinchHintOnce();
                this.pinchHintShown = true;
            }

            event.preventDefault();
            event.stopPropagation();
        }
    },

    handleTouchMove: function (event) {
        if (!this.isPinching || event.touches.length !== 2) return;

        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = this.getDistance(touch1, touch2);

        if (this.initialDistance === null || this.initialScale === null) return;

        // Вычисляем коэффициент масштабирования
        const scaleFactor = currentDistance / this.initialDistance;

        // Применяем новый масштаб
        this.applyScale(scaleFactor);

        event.preventDefault();
        event.stopPropagation();
    },

    handleTouchEnd: function (event) {
        if (event.touches.length < 2) {
            this.isPinching = false;
            this.initialDistance = null;
            this.initialScale = null;
        }
    },

    applyScale: function (scaleFactor) {
        const clampedScale = Math.max(
            this.data.min,
            Math.min(this.data.max, scaleFactor)
        );

        const newScale = {
            x: this.initialScale.x * clampedScale,
            y: this.initialScale.y * clampedScale,
            z: this.initialScale.z * clampedScale
        };

        this.el.setAttribute('scale', newScale);
    },

    getDistance: function (touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    },

    isModelVisible: function () {
        const model = this.el;
        return model && model.getAttribute('visible') !== false;
    },

    showPinchHintOnce: function () {
        // Показываем подсказку только один раз при первом жесте
        const hint = document.createElement('div');
        hint.innerHTML = '✅ Жест масштабирования активирован';
        hint.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 150, 0, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            z-index: 10001;
            font-family: 'Pacifico', cursive;
            font-size: 16px;
            text-align: center;
            opacity: 0;
            animation: pinchHintFade 2s ease;
        `;

        // Анимация появления и исчезновения
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pinchHintFade {
                0% { opacity: 0; transform: translate(-50%, -50%) translateY(-10px); }
                20% { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
                80% { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
                100% { opacity: 0; transform: translate(-50%, -50%) translateY(-10px); }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(hint);

        setTimeout(() => {
            hint.remove();
            style.remove();
        }, 2000);
    },

    remove: function () {
        // Очистка событий при удалении компонента
        this.sceneEl.removeEventListener('touchstart', this.handleTouchStart);
        this.sceneEl.removeEventListener('touchmove', this.handleTouchMove);
        this.sceneEl.removeEventListener('touchend', this.handleTouchEnd);
        this.sceneEl.removeEventListener('touchcancel', this.handleTouchEnd);
    }
});

// 2. Улучшенный менеджер жестов с приоритетом масштабирования
function setupEnhancedPinchZoom() {
    const model = document.querySelector('#model') || document.querySelector('#fallbackModel');

    if (!model) {
        console.warn('Модель не найдена для жеста масштабирования');
        return false;
    }

    // Проверяем, размещена ли модель
    const checkModelPlacement = setInterval(() => {
        if (model.getAttribute('visible') === true ||
            (model.parentElement && model.parentElement.getAttribute('visible') === true)) {

            // Добавляем компонент масштабирования
            model.setAttribute('pinch-scale', {
                min: 0.03,
                max: 0.3,
                sensitivity: 0.0008
            });

            console.log('Жест масштабирования активирован');
            clearInterval(checkModelPlacement);

            // Интегрируем с существующими жестами
            integrateWithExistingGestures();

            return true;
        }
    }, 1000);

    // Отмена проверки через 10 секунд
    setTimeout(() => clearInterval(checkModelPlacement), 10000);
}

// 3. Интеграция с существующими жестами вращения/перемещения
function integrateWithExistingGestures() {
    const scene = document.querySelector('#arScene');
    let activeGesture = null; // 'pinch', 'rotate', 'move', null

    // Перехватываем все касания для определения типа жеста
    scene.addEventListener('touchstart', function (e) {
        const touches = e.touches.length;

        if (touches === 2) {
            activeGesture = 'pinch';
            // Отключаем режимы вращения/перемещения на время жеста масштабирования
            if (window.isRotating) window.isRotating = false;
            if (window.isMoving) window.isMoving = false;
        } else if (touches === 1) {
            // Проверяем, какой режим активен
            if (window.currentMode === 'rotate') activeGesture = 'rotate';
            else if (window.currentMode === 'move') activeGesture = 'move';
        }
    }, { passive: true });

    scene.addEventListener('touchend', function () {
        activeGesture = null;
    }, { passive: true });

    // Обновляем обработчики существующих кнопок
    updateGestureButtons();
}

// 4. Обновление кнопок управления для учета жеста масштабирования
function updateGestureButtons() {
    const rotateBtn = document.getElementById('RotateButton');
    const moveBtn = document.getElementById('MoveButton');

    if (rotateBtn && moveBtn) {
        // Добавляем информацию о жесте масштабирования в подсказки
        rotateBtn.title = 'Вращение одним пальцем\n(два пальца - масштабирование)';
        moveBtn.title = 'Перемещение одним пальцем\n(два пальца - масштабирование)';

        // Обновляем обработчики для сброса жеста масштабирования
        const originalRotateClick = rotateBtn.onclick;
        rotateBtn.onclick = function (e) {
            if (window.currentMode === 'rotate') {
                window.currentMode = 'none';
                window.isRotating = false;
            } else {
                window.currentMode = 'rotate';
                window.isRotating = true;
                window.isMoving = false;
            }
            if (originalRotateClick) originalRotateClick.call(this, e);
        };

        const originalMoveClick = moveBtn.onclick;
        moveBtn.onclick = function (e) {
            if (window.currentMode === 'move') {
                window.currentMode = 'none';
                window.isMoving = false;
            } else {
                window.currentMode = 'move';
                window.isMoving = true;
                window.isRotating = false;
            }
            if (originalMoveClick) originalMoveClick.call(this, e);
        };
    }
}

// 5. Добавление визуального индикатора масштабирования
function addScaleIndicator() {
    // Создаем индикатор в сцене A-Frame
    const indicator = document.createElement('a-entity');
    indicator.id = 'scaleIndicator';
    indicator.setAttribute('position', '0 -0.5 -1');
    indicator.setAttribute('visible', 'false');
    indicator.innerHTML = `
        <a-ring color="#4CAF50" radius-inner="0.45" radius-outer="0.5" opacity="0.5"></a-ring>
        <a-text value="Масштаб" align="center" color="white" position="0 0.6 0" scale="0.5 0.5 0.5"></a-text>
    `;

    document.querySelector('#arScene').appendChild(indicator);

    // Функция для показа/скрытия индикатора
    window.showScaleIndicator = function (show) {
        const indicator = document.querySelector('#scaleIndicator');
        if (indicator) {
            indicator.setAttribute('visible', show);
        }
    };

    // Функция для обновления значения масштаба
    window.updateScaleValue = function (scale) {
        const indicator = document.querySelector('#scaleIndicator');
        if (indicator) {
            const text = indicator.querySelector('a-text');
            if (text) {
                const percent = Math.round(scale * 1000);
                text.setAttribute('value', `Масштаб: ${percent}%`);
            }
        }
    };
}

// 6. Расширенная инициализация с отладкой
function initEnhancedPinchZoom() {
    console.log('Инициализация расширенного жеста масштабирования...');

    // Ждем загрузки A-Frame и модели
    const checkReady = setInterval(() => {
        const scene = document.querySelector('#arScene');
        const model = document.querySelector('#model') || document.querySelector('#fallbackModel');

        if (scene && model && scene.hasLoaded) {
            clearInterval(checkReady);

            // Добавляем индикатор масштаба
            addScaleIndicator();

            // Настраиваем жест масштабирования
            const success = setupEnhancedPinchZoom();

            if (success) {
                console.log('✅ Жест масштабирования настроен');

                // Добавляем информацию в интерфейс
                addScaleInfoToUI();

                // Тестовая функция для проверки
                window.testPinchZoom = function () {
                    const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
                    if (model) {
                        const currentScale = model.getAttribute('scale');
                        console.log('Текущий масштаб:', currentScale);
                        alert(`Текущий масштаб: ${JSON.stringify(currentScale)}`);
                    }
                };
            }
        }
    }, 500);
}

// 7. Добавление информации о жесте в интерфейс
function addScaleInfoToUI() {
    // Создаем информационную панель
    const infoPanel = document.createElement('div');
    infoPanel.id = 'gestureInfo';
    infoPanel.style.cssText = `
        position: fixed;
        top: 12vh;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 10px;
        z-index: 9999;
        font-family: 'Pacifico', cursive;
        font-size: 14px;
        text-align: center;
        display: none;
        backdrop-filter: blur(5px);
    `;
    infoPanel.innerHTML = '✌️ Два пальца = Масштабирование';

    document.body.appendChild(infoPanel);

    // Показываем информацию при первом размещении модели
    const originalShowMessage = window.showMessage;
    if (typeof originalShowMessage === 'function') {
        window.showMessage = function (text, duration) {
            if (text.includes('размещена') || text.includes('Размещено')) {
                setTimeout(() => {
                    infoPanel.style.display = 'block';
                    setTimeout(() => {
                        infoPanel.style.display = 'none';
                    }, 5000);
                }, 1000);
            }
            return originalShowMessage.call(this, text, duration);
        };
    }
}

// 8. Запуск инициализации при загрузке
document.addEventListener('DOMContentLoaded', function () {
    // Запускаем через 2 секунды после загрузки
    setTimeout(initEnhancedPinchZoom, 2000);
});

// 9. Глобальные функции для отладки и управления
window.gestureDebug = {
    getModelScale: function () {
        const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
        return model ? model.getAttribute('scale') : null;
    },

    setModelScale: function (scale) {
        const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
        if (model) {
            model.setAttribute('scale', Array.isArray(scale) ? scale.join(' ') : scale);
            return true;
        }
        return false;
    },

    resetModelScale: function () {
        return this.setModelScale('0.1 0.1 0.1');
    },

    enablePinchGesture: function () {
        const model = document.querySelector('#model') || document.querySelector('#fallbackModel');
        if (model) {
            model.setAttribute('pinch-scale', '');
            return true;
        }
        return false;
    }
};

console.log('Модуль жеста масштабирования загружен. Используйте window.gestureDebug для отладки.');