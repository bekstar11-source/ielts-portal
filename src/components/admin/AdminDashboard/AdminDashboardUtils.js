export const getTimeStatus = (lastActiveAt) => {
    if (!lastActiveAt) return { status: 'offline', text: 'Uzoq vaqt oldin' };
    const date = lastActiveAt.seconds ? new Date(lastActiveAt.seconds * 1000) : new Date(lastActiveAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 5) return { status: 'online', text: 'Online' };
    if (diffMins < 60) return { status: 'offline', text: `${diffMins} daqiqa oldin` };
    if (diffMins < 1440) return { status: 'offline', text: `${Math.floor(diffMins / 60)} soat oldin` };

    return { status: 'offline', text: date.toLocaleDateString() };
};
