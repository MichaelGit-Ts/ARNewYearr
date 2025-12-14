const screenshotBtn = document.getElementById('ShotButton');
const scene = document.querySelector('a-scene');

screenshotBtn.addEventListener('click', function () {
    scene.components.screenshot.capture('perspective')
        .then(function (dataURI) {
            const link = document.createElement('a');
            link.download = 'screenshot-' + Date.now() + '.png';
            link.href = dataURI;
            link.click();

        })
        .catch(function (error) {
            console.error('Ошибка при создании скриншота:', error);
        });
});