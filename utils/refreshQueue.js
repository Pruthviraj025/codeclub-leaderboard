const queue = [];
const queuedUsers = new Set();

function enqueue(userId) {

    userId = String(userId);

    if (queuedUsers.has(userId)) {
        return false;
    }

    queuedUsers.add(userId);

    queue.push(userId);

    return true;

}

function dequeue() {

    if (!queue.length) {
        return null;
    }

    const userId = queue.shift();

    queuedUsers.delete(userId);

    return userId;

}

function size() {
    return queue.length;
}

function isQueued(userId) {
    return queuedUsers.has(String(userId));
}

module.exports = {
    enqueue,
    dequeue,
    size,
    isQueued
};