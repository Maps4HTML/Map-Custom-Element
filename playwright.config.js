const config = {
    timeout: 30000,
    testDir: './test/e2e',
    webServer: {
        command: 'node test/server.js',
        port: 30001,
        timeout: 10000
    },
    use: {
        headless: true,
        browserName: 'chromium',
        baseURL: 'http://localhost:30001/'
    }
};
module.exports = config;