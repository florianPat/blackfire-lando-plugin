'use strict';

// Modules
const _ = require('lodash');
const utils = require('./../lib/utils');

// Builder
module.exports = {
    name: 'blackfire',
    config: {
        version: '2',
        supported: ['2'],
        server_id: '',
        server_token: '',
        client_id: '',
        client_token: '',
        log_level: '1',
        app_service: 'appserver',
        port: '8307',
        meUser: 'blackfire', // Ensure to use the appropriate user within the container.
        appMount: '/',
        app_service_is_php: false,
    },
    parent: '_compose',
    builder: (parent, config) => class LandoBlackfire extends parent {
        constructor(id, options = {}) {
            options = _.merge({}, config, options);

            // Ensure that the credentials are correctly set.
            _.forEach(['server_id', 'server_token', 'client_id', 'client_token'], function (value) {
                if (!options[value]) {
                    throw Error(`Blackfire credentials must be configured in your LandoFile. "${value}" is missing.`);
                }
            });

            // Define the Blackfire service.
            const blackfire = {
                image: `blackfire/blackfire:${options.version}`,
                entrypoint: '/helpers/lando-entrypoint.sh',
                command: '/usr/local/bin/entrypoint.sh blackfire agent:start',
                environment: {
                    BLACKFIRE_SERVER_ID: options.server_id,
                    BLACKFIRE_SERVER_TOKEN: options.server_token,
                    BLACKFIRE_CLIENT_ID: options.client_id,
                    BLACKFIRE_CLIENT_TOKEN: options.client_token,
                    BLACKFIRE_LOG_LEVEL: options.log_level,
                },
            };

            const appService = _.get(options._app, `config.services.${options.app_service}`);
            if (appService.type?.includes('php') || options.app_service_is_php) {
                utils.addBuildStep(
                    [
                        '/helpers/install-blackfire-probe.sh',
                        '/helpers/install-blackfire-cli.sh',
                        '/helpers/install-blackfire-player.sh',
                    ],
                    options._app,
                    options.app_service,
                    'build_as_root_internal'
                );
            } else {
                // Only install blackfire CLI
                utils.addBuildStep(['/helpers/install-blackfire-cli.sh'], options._app, options.app_service, 'build_as_root_internal');
            }

            _.set(options._app, `config.services.${options.name}.appMount`, options.appMount);

            const info = {}
            info.config = config;
            info.service = options.name;
            info.type = config.type;
            info.version = config.version;
            info.meUser = config.meUser;
            info.api = 3;

            // Send it downstream
            super(id, info, {services: _.set({}, options.name, blackfire)});
        };
    },
};
