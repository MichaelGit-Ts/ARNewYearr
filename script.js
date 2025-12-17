class ARViewer {
    constructor() {
        // Инициализация
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.video = document.getElementById('cameraVideo');
        this.canvas = document.getElementById('arCanvas');
        this.models = [];
        this.currentMode = 'move'; // 'move' или 'rotate'
        this.touchStart = { x: 0, y: 0 };
        this.selectedModel = null;
        this.isDragging = false;

        // Элементы UI
        this.loading = document.getElementById('loading');
        this.modelList = document.getElementById('modelList');
        this.moveBtn = document.getElementById('moveBtn');
        this.rotateBtn = document.getElementById('rotateBtn');
        this.photoBtn = document.getElementById('photoBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // Инициализация
        this.initCamera();
        this.initThreeJS();
        this.setupEventListeners();
        this.loadModelList();

        // Начальная анимация
        this.animate();
    }

    async initCamera() {
        try {
            this.showLoading('Запуск камеры...');

            // Получаем доступ к камере
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            this.video.srcObject = stream;
            await this.video.play();

            this.hideLoading();

        } catch (error) {
            console.error('Ошибка камеры:', error);
            this.showLoading('Ошибка доступа к камере');
        }
    }

    initThreeJS() {
        // Размеры
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Создаем камеру Three.js
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 5);

        // Создаем рендерер
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);

        // Добавляем сетку для ориентации (опционально)
        const gridHelper = new THREE.GridHelper(10, 10);
        gridHelper.visible = false; // Скрываем по умолчанию
        this.scene.add(gridHelper);
    }

    setupEventListeners() {
        // Кнопка списка моделей
        document.getElementById('modelBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.modelList.classList.toggle('active');
        });

        // Закрытие списка при клике вне его
        document.addEventListener('click', () => {
            this.modelList.classList.remove('active');
        });

        // Режимы управления
        this.moveBtn.addEventListener('click', () => {
            this.currentMode = 'move';
            this.moveBtn.classList.add('active');
            this.rotateBtn.classList.remove('active');
        });

        this.rotateBtn.addEventListener('click', () => {
            this.currentMode = 'rotate';
            this.rotateBtn.classList.add('active');
            this.moveBtn.classList.remove('active');
        });

        // Кнопка фото
        this.photoBtn.addEventListener('click', () => this.takePhoto());

        // Кнопка сброса
        this.resetBtn.addEventListener('click', () => this.resetScene());

        // Обработка жестов
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onTouchEnd());

        // Обработка жеста pinch для масштабирования
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                this.handlePinchStart(e);
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && this.selectedModel) {
                this.handlePinchMove(e);
            }
        });

        // Адаптивность при изменении размера окна
        window.addEventListener('resize', () => this.onResize());

        // Клик для выбора модели
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    }

    loadModelList() {
        // Список моделей (замените на свои модели)
        const models = [
            { id: 'cube', name: 'Елка', icon: '⬜', path: 'models/elka2.glb' },
            { id: 'sphere', name: 'Автобус', icon: '⭕', path: 'models/bus.glb' }
        ];

        // Добавляем иконки в список
        models.forEach(model => {
            const icon = document.createElement('div');
            icon.className = 'model-icon';
            icon.innerHTML = model.icon;
            icon.title = model.name;

            icon.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.loadModel(model.path);
                this.modelList.classList.remove('active');
            });

            this.modelList.appendChild(icon);
        });
    }

    async loadModel(path) {
        this.showLoading('Загрузка модели...');

        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();

            loader.load(
                path,
                (gltf) => {
                    const model = gltf.scene;

                    // Настройка модели
                    model.userData.id = Date.now();
                    model.position.set(0, 0, -2);
                    model.scale.set(0.5, 0.5, 0.5);

                    // Добавляем рамку выделения
                    const box = new THREE.BoxHelper(model, 0x00ff00);
                    box.visible = false;
                    model.add(box);

                    this.scene.add(model);
                    this.models.push(model);
                    this.selectedModel = model;

                    this.hideLoading();
                    resolve(model);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    this.showLoading(`Загрузка модели... ${percent}%`);
                },
                (error) => {
                    console.error('Ошибка загрузки модели:', error);
                    this.showLoading('Ошибка загрузки модели');
                    setTimeout(() => this.hideLoading(), 2000);
                    reject(error);
                }
            );
        });
    }

    onTouchStart(e) {
        if (!this.selectedModel || e.touches.length !== 1) return;

        this.isDragging = true;
        this.touchStart.x = e.touches[0].clientX;
        this.touchStart.y = e.touches[0].clientY;

        this.canvas.style.pointerEvents = 'auto';
    }

    onTouchMove(e) {
        if (!this.selectedModel || !this.isDragging || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStart.x;
        const deltaY = touch.clientY - this.touchStart.y;

        if (this.currentMode === 'move') {
            // Перемещение модели
            this.selectedModel.position.x += deltaX * 0.01;
            this.selectedModel.position.y -= deltaY * 0.01;
        } else if (this.currentMode === 'rotate') {
            // Поворот модели
            this.selectedModel.rotation.y += deltaX * 0.01;
            this.selectedModel.rotation.x += deltaY * 0.01;
        }

        this.touchStart.x = touch.clientX;
        this.touchStart.y = touch.clientY;

        e.preventDefault();
    }

    onTouchEnd() {
        this.isDragging = false;
        this.canvas.style.pointerEvents = 'none';
    }

    handlePinchStart(e) {
        if (!this.selectedModel) return;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        this.pinchStartDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );

        this.pinchStartScale = this.selectedModel.scale.x;
    }

    handlePinchMove(e) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );

        const scaleFactor = currentDistance / this.pinchStartDistance;
        const newScale = this.pinchStartScale * scaleFactor;

        // Ограничиваем масштаб
        newScale = Math.max(0.1, Math.min(5, newScale));

        this.selectedModel.scale.setScalar(newScale);
    }

    onCanvasClick(e) {
        // Raycaster для выбора модели
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, this.camera);

        // Ищем пересечения
        const intersects = raycaster.intersectObjects(this.models, true);

        if (intersects.length > 0) {
            // Нашли модель - выделяем её
            let model = intersects[0].object;

            // Поднимаемся до корневой модели
            while (model.parent && !this.models.includes(model)) {
                model = model.parent;
            }

            if (this.models.includes(model)) {
                this.selectModel(model);
            }
        } else {
            // Клик мимо модели - снимаем выделение
            this.selectedModel = null;
        }
    }

    selectModel(model) {
        // Снимаем выделение со всех моделей
        this.models.forEach(m => {
            const box = m.getObjectByProperty('type', 'BoxHelper');
            if (box) box.visible = false;
        });

        // Выделяем выбранную модель
        this.selectedModel = model;
        const box = model.getObjectByProperty('type', 'BoxHelper');
        if (box) box.visible = true;
    }

    async takePhoto() {
        try {
            this.showLoading('Создание фото...');

            // Создаем временный canvas для объединения видео и 3D
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;

            // 1. Рисуем видео кадр
            tempCtx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);

            // 2. Рисуем 3D сцену поверх
            tempCtx.drawImage(this.canvas, 0, 0);

            // Конвертируем в blob
            tempCanvas.toBlob(async (blob) => {
                if (!blob) {
                    this.showLoading('Ошибка создания фото');
                    setTimeout(() => this.hideLoading(), 2000);
                    return;
                }

                // Сохраняем файл
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `ar-photo-${Date.now()}.png`;
                link.click();

                // Очищаем URL
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);

                this.hideLoading();

            }, 'image/png');

        } catch (error) {
            console.error('Ошибка создания фото:', error);
            this.showLoading('Ошибка создания фото');
            setTimeout(() => this.hideLoading(), 2000);
        }
    }

    resetScene() {
        // Удаляем все модели
        this.models.forEach(model => {
            this.scene.remove(model);
        });

        this.models = [];
        this.selectedModel = null;
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Обновляем рендерер
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    showLoading(text) {
        this.loading.textContent = text;
        this.loading.style.display = 'block';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    new ARViewer();
});

// Обработка ошибок загрузки ресурсов
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
});