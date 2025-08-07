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
    effect: 'slide',
    spaceBetween: 20,
});

document.querySelector('.main-button').addEventListener('click', () => {
    alert('Спасибо за интерес! Свяжитесь со мной по телефону или email.');
});
