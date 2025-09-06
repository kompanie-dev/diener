function connectLiveReloadServer() {
    const socket = new WebSocket("ws://localhost:{{PORT}}");

    socket.onclose = () => {
        console.warn("Can't connect to livereload server. Attempting to reconnect...");
        setTimeout(connectLiveReloadServer, 3000);
    };

    socket.onerror = () => {
        socket.close();
    };

    socket.onmessage = () => {
        console.info("🔄 Change detected. Reloading...");
        location.reload();
    };

    socket.onopen = () => {
        console.info("✅ Connected to livereload server");
    };
}

connectLiveReloadServer();