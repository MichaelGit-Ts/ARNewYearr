document.addEventListener('DOMContentLoaded', function () {
    const scene = document.querySelector('#arScene');
    const model = document.querySelector('#arModel');
    const placeBtn = document.querySelector('#PlaceButton');
    const resetBtn = document.querySelector('#ResetButton');
    const shotBtn = document.querySelector('#ShotButton');
    const rotateRing = document.querySelector('#rotateRing');
    const moveRing = document.querySelector('#moveRing');
    const instructions = document.querySelector('#instructions');

    // Состояние приложения
    let isModelPlaced = false;
    let isRotating = false;
    let isMoving = false;
    let lastTouch = { x: 0, y: 0 };
    let modelScale = 0.1;

    // 1. Инициализация AR
    function initAR() {
        console.log('Инициализация AR...');

        // Проверяем поддержку AR
        checkARSupport();

        // Скрываем UI элементы пока модель не размещена
        rotateRing.setAttribute('visible', 'false');
        moveRing.setAttribute('visible', 'false');

        // Показываем инструкции при первом запуске
        if (!localStorage.getItem('arInstructionsShown')) {
            instructions.style.display = 'flex';
        }
    }

    // 2. Проверка поддержки AR
    function checkARSupport() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        if (isIOS) {
            // iOS 12+ с AR.js
            console.log('iOS устройство - используем AR.js');
            setupARJS();
        } else if (isAndroid) {
            // Android с WebXR или AR.js
            if ('xr' in navigator) {
                console.log('Android с WebXR поддержкой');
                setupWebXR();
            } else {
                console.log('Android без WebXR - используем AR.js');
                setupARJS();
            }
        } else {
            // Десктоп - показываем 3D без AR
            console.log('Десктоп - 3D режим');
            setup3DOnly();
        }
    }

    // 3. Настройка AR.js (iOS и старые Android)
    function setupARJS() {
        const marker = document.querySelector('#placementMarker');

        placeBtn.addEventListener('click', function () {
            if (!isModelPlaced) {
                // Размещаем модель на маркере
                marker.setAttribute('visible', 'true');
                model.setAttribute('position', '0 0.5 0');

                // Показываем UI для управления
                rotateRing.setAttribute('visible', 'true');
                moveRing.setAttribute('visible', 'true');

                isModelPlaced = true;
                placeBtn.textContent = '🔄 Переместить';
            }
        });

        // Следим за маркером
        marker.addEventListener('markerFound', function () {
            console.log('Маркер найден!');
        });

        marker.addEventListener('markerLost', function () {
            console.log('Маркер потерян');
        });
    }

    // 4. Настройка жестов (аналог Quick Look)
    function setupGestures() {
        // Вращение модели
        rotateRing.addEventListener('mousedown', startRotate);
        rotateRing.addEventListener('touchstart', startRotate);

        // Перемещение модели
        moveRing.addEventListener('mousedown', startMove);
        moveRing.addEventListener('touchstart', startMove);

        // Масштабирование (pinch gesture)
        scene.addEventListener('touchstart', handleTouchStart);
        scene.addEventListener('touchmove', handleTouchMove);

        // Глобальные события
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopInteractions);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', stopInteractions);
    }

    function startRotate(event) {
        event.preventDefault();
        isRotating = true;
        lastTouch = getEventPosition(event);
    }

    function startMove(event) {
        event.preventDefault();
        isMoving = true;
        lastTouch = getEventPosition(event);
    }

    function handleMouseMove(event) {
        if (!isModelPlaced) return;

        const currentPos = { x: event.clientX, y: event.clientY };

        if (isRotating) {
            // Вращение вокруг оси Y
            const deltaX = currentPos.x - lastTouch.x;
            const rotation = model.getAttribute('rotation');
            model.setAttribute('rotation', {
                x: rotation.x,
                y: rotation.y + deltaX * 0.5,
                z: rotation.z
            });
        }

        if (isMoving) {
            // Перемещение в плоскости
            const deltaX = (currentPos.x - lastTouch.x) * 0.01;
            const deltaY = (currentPos.y - lastTouch.y) * -0.01;
            const position = model.getAttribute('position');
            model.setAttribute('position', {
                x: position.x + deltaX,
                y: position.y + deltaY,
                z: position.z
            });

            // Перемещаем UI вместе с моделью
            const ui = document.querySelector('#arUI');
            ui.setAttribute('position', {
                x: position.x + deltaX,
                y: -1,
                z: position.z
            });
        }

        lastTouch = currentPos;
    }

    let initialDistance = null;

    function handleTouchStart(event) {
        if (event.touches.length === 2) {
            // Начало pinch жеста
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            initialDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }

    function handleTouchMove(event) {
        if (event.touches.length === 2 && isModelPlaced) {
            // Масштабирование pinch жестом
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            if (initialDistance !== null) {
                const scaleFactor = currentDistance / initialDistance;
                modelScale = Math.max(0.05, Math.min(0.5, modelScale * scaleFactor));
                model.setAttribute('scale', `${modelScale} ${modelScale} ${modelScale}`);
                initialDistance = currentDistance;
            }
        } else {
            // Обработка одиночного касания
            handleMouseMove(event.touches[0]);
        }
    }

    function stopInteractions() {
        isRotating = false;
        isMoving = false;
        initialDistance = null;
    }

    function getEventPosition(event) {
        if (event.touches && event.touches.length > 0) {
            return { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
        return { x: event.clientX, y: event.clientY };
    }

    // 5. Функция фото (кросс-платформенная)
    shotBtn.addEventListener('click', async function () {
        if (!isModelPlaced) {
            alert('Сначала разместите модель!');
            return;
        }

        try {
            // Способ 1: WebXR screenshot если доступно
            if (navigator.xr && scene.renderer) {
                const xrSession = scene.renderer.xr.getSession();
                if (xrSession) {
                    const canvas = await xrSession.end();
                    saveCanvasAsImage(canvas);
                    return;
                }
            }

            // Способ 2: Canvas рендерера Three.js
            if (scene.renderer && scene.renderer.domElement) {
                const canvas = scene.renderer.domElement;
                if (canvas.width > 100) {
                    saveCanvasAsImage(canvas);
                    return;
                }
            }

            // Способ 3: Ручной рендер
            manualScreenshot();

        } catch (error) {
            console.error('Ошибка фото:', error);
            alert('Используйте системный скриншот:\niOS: Кнопка питания + Громкость вверх\nAndroid: Кнопка питания + Громкость вниз');
        }
    });

    function saveCanvasAsImage(canvas) {
        // Создаем новый canvas с белым фоном
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = canvas.width;
        finalCanvas.height = canvas.height;
        const ctx = finalCanvas.getContext('2d');

        // Белый фон
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        // Копируем AR сцену
        ctx.drawImage(canvas, 0, 0);

        // Добавляем водяной знак
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = '20px Pacifico';
        ctx.fillText('🎄 С Новым Годом!', 20, finalCanvas.height - 30);

        // Сохраняем
        const link = document.createElement('a');
        link.download = `AR_НовыйГод_${Date.now()}.png`;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();

        // Уведомление
        showNotification('Фото сохранено!');
    }

    function manualScreenshot() {
        // Альтернативный метод для сложных случаев
        const tempScene = document.createElement('a-scene');
        tempScene.setAttribute('embedded', '');
        tempScene.innerHTML = `
            <a-entity camera="active: true" position="0 1.6 0"></a-entity>
            <a-entity light="type: ambient; color: #FFF; intensity: 0.8"></a-entity>
            <a-entity light="type: directional; color: #FFF; intensity: 0.5" position="-1 2 1"></a-entity>
            <a-entity gltf-model="#busModel" scale="0.1 0.1 0.1" rotation="0 45 0"></a-entity>
        `;

        document.body.appendChild(tempScene);

        setTimeout(() => {
            const canvas = tempScene.canvas;
            saveCanvasAsImage(canvas);
            document.body.removeChild(tempScene);
        }, 1000);
    }

    // 6. Вспомогательные функции
    resetBtn.addEventListener('click', function () {
        model.setAttribute('position', '0 0 -2');
        model.setAttribute('rotation', '0 0 0');
        model.setAttribute('scale', '0.1 0.1 0.1');
        modelScale = 0.1;

        const ui = document.querySelector('#arUI');
        ui.setAttribute('position', '0 -1 -2');

        showNotification('Модель сброшена');
    });

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            z-index: 10000;
            font-family: Pacifico, cursive;
            font-size: 18px;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    // Закрытие инструкций
    document.querySelector('#closeInstructions').addEventListener('click', function () {
        instructions.style.display = 'none';
        localStorage.setItem('arInstructionsShown', 'true');
    });

    // 7. Инициализация
    setTimeout(initAR, 1000);
    setTimeout(setupGestures, 1500);

    // Компонент для жестов A-Frame
    AFRAME.registerComponent('gesture-handler', {
        schema: {
            minScale: { type: 'number', default: 0.05 },
            maxScale: { type: 'number', default: 0.5 }
        },
        init: function () {
            this.scaleFactor = 1;
            this.initialDistance = 0;

            this.el.addEventListener('touchstart', this.onTouchStart.bind(this));
            this.el.addEventListener('touchmove', this.onTouchMove.bind(this));
        },
        onTouchStart: function (evt) {
            if (evt.touches.length === 2) {
                this.initialDistance = this.getDistance(evt.touches[0], evt.touches[1]);
            }
        },
        onTouchMove: function (evt) {
            if (evt.touches.length === 2) {
                const currentDistance = this.getDistance(evt.touches[0], evt.touches[1]);
                const scale = currentDistance / this.initialDistance;

                this.scaleFactor = Math.max(
                    this.data.minScale,
                    Math.min(this.data.maxScale, scale)
                );

                this.el.setAttribute('scale', {
                    x: this.scaleFactor * 0.1,
                    y: this.scaleFactor * 0.1,
                    z: this.scaleFactor * 0.1
                });
            }
        },
        getDistance: function (touch1, touch2) {
            return Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    });
});