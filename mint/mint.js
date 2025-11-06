
document.addEventListener('DOMContentLoaded', () => {
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach((card, index) => {
        card.style.animationDelay = `${0.1 * index}s`;
        card.style.animation = 'fadeInUp 0.6s ease both';
    });

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        toolCards.forEach((card, index) => {
            if (!card.classList.contains('placeholder')) {
                const depth = (index % 4 + 1) * 0.5;
                const translateX = targetX * depth * 5;
                const translateY = targetY * depth * 5;
                
                card.style.transform = `translate(${translateX}px, ${translateY}px)`;
            }
        });

        requestAnimationFrame(animate);
    }

    animate();

});
