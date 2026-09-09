(() => {
    const form = document.getElementById('monitorForm');
    if (!form) return;
    const update = () => {
        const fields = [...form.querySelectorAll('[required]')].filter(field => !field.disabled && field.type !== 'hidden');
        const valid = fields.filter(field => field.value.trim() && field.validity.valid).length;
        document.getElementById('formProgress').value = fields.length ? Math.round(valid / fields.length * 100) : 0;
        document.getElementById('formProgressText').textContent = `${valid} / ${fields.length} medan wajib lengkap`;
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    new MutationObserver(update).observe(form,{childList:true,subtree:true});
    const links = [...document.querySelectorAll('.form-section-nav a')];
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => entries.forEach(entry => {
            if (entry.isIntersecting) links.forEach(link => {
                const current = link.hash === '#'+entry.target.id;
                link.classList.toggle('active', current);
                if (current) link.setAttribute('aria-current','step'); else link.removeAttribute('aria-current');
            });
        }),{rootMargin:'-10% 0px -65% 0px'});
        document.querySelectorAll('.survey-section').forEach(section => observer.observe(section));
    }
    form.addEventListener('invalid', event => {
        const section = event.target.closest('.survey-section');
        if (section) links.forEach(link => link.classList.toggle('active',link.hash === '#'+section.id));
    },true);
    update();
})();
