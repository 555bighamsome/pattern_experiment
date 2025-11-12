function ensureToastContainer() {
    let container = document.getElementById('app-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'app-toast-container';
        container.style.position = 'fixed';
        container.style.right = '16px';
        container.style.bottom = '16px';
        container.style.zIndex = 9999;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        document.body.appendChild(container);
    }
    return container;
}

export function showToast(message, type = 'info', timeout = 2500) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `app-toast app-toast-${type}`;
    toast.textContent = message;
    toast.style.padding = '8px 12px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
    toast.style.background = type === 'error'
        ? '#f87171'
        : type === 'warning'
            ? '#fbbf24'
            : '#111827';
    toast.style.color = '#fff';
    toast.style.fontSize = '13px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => {
            if (toast.parentElement === container) {
                container.removeChild(toast);
            }
        }, 220);
    }, timeout);
}
