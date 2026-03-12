/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Monult } from '../../index';
import { configManager } from '../../config/config-manager';

/**
 * Initializes and returns a Monult instance configured with both local/global configs.
 */
export async function initMonult(): Promise<Monult> {
    const globalConfig = await configManager.getGlobalConfig();
    return new Monult(undefined, globalConfig);
}
