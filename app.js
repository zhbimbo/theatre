(function () {
  const API = window.STORY_THEATRE_CONFIG?.API_BASE_URL || 'https://theatre-o08i.onrender.com';
  const POLICY_VERSION = window.STORY_THEATRE_CONFIG?.POLICY_VERSION || '2026-06-12';

  let events = [];
  let currentEvent = null;
  let availableTickets = {};

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function updateConsentButtons() {
    const purchaseConsent = document.getElementById('consentPd');
    const submitBtn = document.getElementById('submitButton');
    if (submitBtn && purchaseConsent) {
      submitBtn.disabled = !purchaseConsent.checked;
    }
    const waitConsent = document.getElementById('waitlistConsentPd');
    const waitBtn = document.getElementById('waitlistSubmit');
    if (waitBtn && waitConsent) {
      waitBtn.disabled = !waitConsent.checked;
    }
  }

  function updateBottomButtons() {
    const buyBtn = document.getElementById('mainBuyButton');
    const affishaBtn = document.getElementById('affishaButton');

    if (events.length) {
      currentEvent = events[0];
      if (buyBtn) buyBtn.style.display = 'flex';
      if (affishaBtn) affishaBtn.style.display = 'none';
    } else {
      currentEvent = null;
      if (buyBtn) buyBtn.style.display = 'none';
      if (affishaBtn) affishaBtn.style.display = 'flex';
    }
  }

  function renderEventModal() {
    if (!currentEvent) return;
    document.getElementById('modalEventTitle').textContent = currentEvent.title;
    document.getElementById('modalEventDescription').textContent = currentEvent.description || '';
    document.getElementById('modalEventDate').textContent = formatDate(currentEvent.date);
    document.getElementById('modalEventLocation').textContent = currentEvent.location || '';
    document.getElementById('modalEventPrice').textContent = Number(currentEvent.price).toLocaleString() + ' ₽';
    updateTimeSlots();
    updateTotalAmount();
  }

  function updateTimeSlots() {
    const timeSelect = document.getElementById('eventTime');
    const availabilityInfo = document.getElementById('ticketAvailability');
    if (!timeSelect || !currentEvent) return;

    timeSelect.innerHTML = '<option value="">-- Выберите время --</option>';
    if (availabilityInfo) availabilityInfo.innerHTML = '';

    (currentEvent.times || []).forEach((timeSlot) => {
      const available = availableTickets[timeSlot.time] ?? timeSlot.available_count ?? 0;
      if (available > 0) {
        timeSelect.innerHTML += `<option value="${timeSlot.time}">${timeSlot.time} (доступно: ${available})</option>`;
      }
    });
  }

  async function loadEvents() {
    try {
      const response = await fetch(API + '/api/events/active');
      const data = await response.json();
      events = data.events || [];
      updateBottomButtons();
      if (events.length) {
        await loadAvailableTickets();
        renderEventModal();
      }
    } catch (error) {
      console.error('Events load error:', error);
      try {
        const fallback = await fetch('events.json');
        const json = await fallback.json();
        if (json.event && json.event.active !== false) {
          const d = new Date(json.event.date);
          if (d >= new Date(new Date().toDateString())) {
            events = [{
              id: json.event.id,
              title: json.event.title,
              description: json.event.description,
              date: json.event.date,
              location: json.event.location,
              price: json.event.price,
              times: json.event.times
            }];
            updateBottomButtons();
            await loadAvailableTickets();
            renderEventModal();
          }
        }
      } catch (_) {}
      updateBottomButtons();
    }
  }

  async function loadAvailableTickets() {
    if (!currentEvent) return;
    try {
      const url = API + '/api/available-tickets?event_id=' + encodeURIComponent(currentEvent.id);
      const response = await fetch(url);
      const tickets = await response.json();
      availableTickets = {};
      tickets.forEach((t) => { availableTickets[t.event_time] = t.available_count; });
      updateTimeSlots();
    } catch (error) {
      (currentEvent.times || []).forEach((t) => {
        availableTickets[t.time] = t.max_tickets || t.available_count || 0;
      });
      updateTimeSlots();
    }
  }

  function openModal() {
    if (!currentEvent) {
      openAffishaModal();
      return;
    }
    renderEventModal();
    document.getElementById('modalOverlay').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  }

  function openAffishaModal() {
    document.getElementById('affishaModalOverlay').style.display = 'flex';
  }

  function closeAffishaModal() {
    document.getElementById('affishaModalOverlay').style.display = 'none';
  }

  function updateTotalAmount() {
    if (!currentEvent) return;
    const quantity = parseInt(document.getElementById('ticketQuantity').value, 10) || 0;
    document.getElementById('totalAmount').textContent = (quantity * currentEvent.price).toLocaleString() + ' ₽';
  }

  async function initPayment(formData) {
    const button = document.getElementById('submitButton');
    button.innerHTML = '<span class="button-text">Подготовка оплаты...</span>';
    button.disabled = true;

    try {
      const response = await fetch(API + '/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          event_id: currentEvent.id,
          policy_version: POLICY_VERSION
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Ошибка сервера');
      }

      const paymentData = await response.json();
      if (paymentData.confirmation?.confirmation_url) {
        window.location.href = paymentData.confirmation.confirmation_url;
      } else {
        throw new Error('Не получили ссылку для оплаты');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
      button.innerHTML = '<span class="button-text">Перейти к оплате</span>';
      updateConsentButtons();
    }
  }

  async function submitWaitlist(e) {
    e.preventDefault();
    const btn = document.getElementById('waitlistSubmit');
    btn.disabled = true;
    btn.textContent = 'Отправка...';

    try {
      const body = {
        name: document.getElementById('waitlistName').value.trim(),
        email: document.getElementById('waitlistEmail').value.trim(),
        phone: document.getElementById('waitlistPhone').value.trim(),
        consent_pd: document.getElementById('waitlistConsentPd').checked,
        consent_marketing: document.getElementById('waitlistConsentMarketing').checked,
        policy_version: POLICY_VERSION
      };

      const response = await fetch(API + '/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка');

      showToast('Спасибо! Сообщим, когда появится афиша.', 'success');
      e.target.reset();
      closeAffishaModal();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.textContent = 'Оставить контакты';
      updateConsentButtons();
    }
  }

  function initScrollAndVideo() {
    const container = document.getElementById('slidesContainer');
    if (!container) return;
    const elements = document.querySelectorAll('.slide-item, .video-item, .video-wrapper');
    const videos = document.querySelectorAll('video');
    const progressBar = document.querySelector('.progress-bar');
    let ticking = false;

    videos.forEach((video) => {
      video.setAttribute('preload', 'none');
      video.muted = true;
    });

    const checkScroll = () => {
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const scrollPercentage = (container.scrollTop / Math.max(scrollHeight - clientHeight, 1)) * 100;
      if (progressBar) progressBar.style.width = scrollPercentage + '%';

      elements.forEach((el) => {
        const elTop = el.getBoundingClientRect().top;
        if (elTop < container.clientHeight * 0.85) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }
      });

      videos.forEach((video) => {
        const rect = video.getBoundingClientRect();
        const visible = rect.top < window.innerHeight && rect.bottom > 0;
        if (visible && video.paused) {
          video.play().catch(() => {});
        } else if (!visible && !video.paused) {
          video.pause();
        }
      });
      ticking = false;
    };

    container.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(checkScroll);
        ticking = true;
      }
    });
    checkScroll();
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    initScrollAndVideo();
    updateConsentButtons();

    document.getElementById('consentPd')?.addEventListener('change', updateConsentButtons);
    document.getElementById('waitlistConsentPd')?.addEventListener('change', updateConsentButtons);

    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
    document.getElementById('affishaModalClose')?.addEventListener('click', closeAffishaModal);
    document.getElementById('affishaModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'affishaModalOverlay') closeAffishaModal();
    });

    document.getElementById('ticketQuantity')?.addEventListener('change', updateTotalAmount);
    document.getElementById('eventTime')?.addEventListener('change', function () {
      const available = availableTickets[this.value] || 0;
      const info = document.getElementById('ticketAvailability');
      if (!info) return;
      if (this.value && available > 0) {
        info.textContent = 'Доступно билетов: ' + available;
        info.className = 'ticket-availability available';
      } else if (this.value) {
        info.textContent = 'Билеты распроданы';
        info.className = 'ticket-availability sold-out';
      } else {
        info.textContent = '';
      }
    });

    document.getElementById('purchaseForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!document.getElementById('consentPd').checked) {
        showToast('Необходимо согласие на обработку ПДн', 'warn');
        return;
      }
      const formData = {
        event_time: document.getElementById('eventTime').value,
        quantity: parseInt(document.getElementById('ticketQuantity').value, 10),
        email: document.getElementById('customerEmail').value,
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        consent_pd: true,
        consent_marketing: document.getElementById('consentMarketing').checked
      };
      if (!formData.event_time || !formData.quantity || !formData.email || !formData.name) {
        showToast('Заполните все поля', 'warn');
        return;
      }
      const available = availableTickets[formData.event_time];
      if (available < formData.quantity) {
        showToast('Доступно только ' + available + ' билетов', 'warn');
        await loadAvailableTickets();
        return;
      }
      await initPayment(formData);
    });

    document.getElementById('waitlistForm')?.addEventListener('submit', submitWaitlist);

    window.openTicketModal = openModal;
    window.openAffishaModal = openAffishaModal;
  });
})();
