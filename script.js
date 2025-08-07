const swiper = new Swiper('.mySwiper', {
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
    loop: true,
    autoplay: {
        delay: 5000,
        disableOnInteraction: false,
    },
    keyboard: {
        enabled: true,
        onlyInViewport: false,
    },
    mousewheel: {
        invert: false,
    },
});

// Обработчик кнопки
document.querySelector('.main-button').addEventListener('click', () => {
    // Здесь можно:
    // - Открыть модальное окно
    // - Перейти по ссылке
    // - Показать контактную информацию
    alert('Спасибо за интерес! Свяжитесь со мной по телефону или email.');
});
