self.onmessage = function (e) {
    if (e.data.command === 'START') {
        let expectedEndTime = Date.now() + (e.data.seconds * 1000);

        // Clear any existing interval
        if (self.timerId) clearInterval(self.timerId);

        self.timerId = setInterval(() => {
            const now = Date.now();
            const distance = expectedEndTime - now;
            const secondsRemaining = Math.ceil(distance / 1000);

            if (distance < 0) {
                clearInterval(self.timerId);
                self.postMessage({ status: 'DONE' });
            } else {
                self.postMessage({
                    status: 'TICK',
                    secondsRemaining: secondsRemaining
                });
            }
        }, 1000); // Check every second
    } else if (e.data.command === 'STOP' || e.data.command === 'RESET') {
        if (self.timerId) clearInterval(self.timerId);
    }
};
