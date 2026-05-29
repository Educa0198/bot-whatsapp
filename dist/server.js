"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const app = (0, app_1.createApp)();
app.listen(env_1.env.PORT, () => {
    logger_1.logger.info("Server started", { port: env_1.env.PORT, env: env_1.env.NODE_ENV });
});
